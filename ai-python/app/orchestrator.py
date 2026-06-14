"""
Async orchestrator — Python port of AgentOrchestrator.

Builds topological levels from the active agents and runs each level
concurrently (asyncio + semaphore). Each agent transition is streamed back
to Node, which persists it and broadcasts over Socket.IO.

Document context (capped, assembled by Node) is shared with every agent via
the sentinel key -1, matching the original intent.
"""
import asyncio
import logging
from typing import Optional

from .agents.base import Agent, DOCUMENTS_KEY
from .agents.registry import active_for_mode, build_execution_levels
from .claude_client import generate_structured
from . import callbacks
from .config import settings
from .models import AnalyzeRequest
from .numeric_integrity import check_numeric_integrity
from .self_correction import run_self_correction

log = logging.getLogger("strategor.orchestrator")


async def run_analysis(req: AnalyzeRequest) -> None:
    """Entry point: runs the full pipeline for one project."""
    project_id = req.projectId
    mode = req.mode or "standard"
    try:
        agents = active_for_mode(mode)
        levels = build_execution_levels(agents)

        # ── Two-phase flow (Agent 1 hypotheses review) ──
        # phase "profile": run only Agent 1.  phase "full": skip Agent 1 (it is
        # seeded from the reviewed output so its dependents can use it).
        # ── Phase routing ──
        # "profile": only Agent 1
        # "full": skip Agent 1 (seeded)
        # "single": only the targetAgentId agent
        if req.phase == "profile":
            levels = [[a for a in lvl if a.agent_id == 1] for lvl in levels]
        elif req.phase == "diagnostic":
            # Run from after Agent 1 up to AND INCLUDING the Diagnostic (Agent 5),
            # then pause for human review of the diagnostic.
            diag_idx = next((i for i, lvl in enumerate(levels)
                             if any(a.agent_id == 5 for a in lvl)), len(levels) - 1)
            levels = [[a for a in lvl if a.agent_id != 1] for lvl in levels[:diag_idx + 1]]
        elif req.phase == "post_diagnostic":
            # Run everything after the Diagnostic level (Agents 1..5 are seeded).
            diag_idx = next((i for i, lvl in enumerate(levels)
                             if any(a.agent_id == 5 for a in lvl)), -1)
            levels = levels[diag_idx + 1:]
        elif req.phase == "full":
            levels = [[a for a in lvl if a.agent_id != 1] for lvl in levels]
        elif req.phase == "single" and req.targetAgentId:
            levels = [[a for a in lvl if a.agent_id == req.targetAgentId] for lvl in levels]
        levels = [lvl for lvl in levels if lvl]

        log.info("Orchestration project=%s mode=%s phase=%s levels=%d",
                 project_id, mode, req.phase, len(levels))

        outputs: dict[int, object] = {}
        if req.documentsContext:
            outputs[DOCUMENTS_KEY] = req.documentsContext  # available to all agents
        # Seed precomputed outputs (e.g. the reviewed Agent 1 output for phase "full").
        if req.seedOutputs:
            for k, v in req.seedOutputs.items():
                try:
                    outputs[int(k)] = v
                except (TypeError, ValueError):
                    log.warning("ignoring seedOutputs key %r", k)

        counter = {"done": 0}
        sem = asyncio.Semaphore(settings.max_parallel_agents)

        for idx, level in enumerate(levels):
            log.info("project=%s level=%d : %d agent(s) in parallel",
                     project_id, idx, len(level))
            await asyncio.gather(*[
                _run_one_agent(req, agent, outputs, counter, sem)
                for agent in level
            ])

        # ── Deterministic numeric-integrity pass (completing runs only) ──
        # Pure-code cross-agent checks; complements Agent 15; never blocks completion.
        if req.phase in ("full", "post_diagnostic"):
            try:
                finance_data = req.financeLite.get("data") if req.financeLite else None
                report = check_numeric_integrity(outputs, req.profile, finance_data)
                # Close the loop: regenerate implicated agents, re-validate (bounded).
                if settings.self_correction_enabled:
                    async def _regen(agent, correction_notes):
                        await _run_one_agent(req, agent, outputs, counter, sem,
                                             correction_notes=correction_notes, is_correction=True)
                    report = await run_self_correction(
                        req, outputs, req.profile, finance_data, report, _regen)
                await callbacks.post_consistency_report(project_id, report)
                log.info("project=%s consistency: %s (%d check(s), %d regenerated)",
                         project_id, report["status"], report["summary"]["checks"],
                         len(report.get("corrections", {}).get("regenerated_agents", [])))
            except Exception as e:
                log.warning("consistency pass failed project=%s: %s", project_id, e)

        await callbacks.post_analysis_complete(project_id, failed=False, phase=req.phase)
        log.info("Orchestration project=%s done (%d agents)", project_id, counter["done"])
    except Exception as e:  # pragma: no cover
        log.exception("Orchestration failed project=%s: %s", project_id, e)
        await callbacks.post_analysis_complete(project_id, failed=True, phase=req.phase)


async def _run_one_agent(req: AnalyzeRequest, agent: Agent,
                         outputs: dict, counter: dict, sem: asyncio.Semaphore,
                         correction_notes: Optional[str] = None,
                         is_correction: bool = False) -> None:
    project_id = req.projectId
    profile = req.profile
    finance = req.financeLite.get("data") if req.financeLite else None

    # Conditional skip (e.g. BCG for micro companies)
    if agent.is_conditional(profile):
        log.info("project=%s agent=%d skipped (conditional)", project_id, agent.agent_id)
        await callbacks.post_agent_event(project_id, {
            "agentId": agent.agent_id,
            "agentName": agent.agent_name,
            "status": "SKIPPED",
            "progress": 100,
            "message": "Agent skippé (non applicable)",
            "doneCount": counter["done"],
        })
        return

    # RUNNING — start
    start_msg = "Démarrage…"
    if is_correction:
        start_msg = "Correction des incohérences…" if correction_notes else "Nouvelle revue de cohérence…"
    await callbacks.post_agent_event(project_id, {
        "agentId": agent.agent_id,
        "agentName": agent.agent_name,
        "status": "RUNNING",
        "progress": 10,
        "message": start_msg,
        "doneCount": counter["done"],
    })

    try:
        # Assemble deps: declared dependencies + shared documents sentinel
        deps: dict[int, object] = {}
        if outputs.get(DOCUMENTS_KEY) is not None:
            deps[DOCUMENTS_KEY] = outputs[DOCUMENTS_KEY]
        for dep_id in agent.depends_on:
            if dep_id in outputs:
                deps[dep_id] = outputs[dep_id]

        prompt = agent.build_system_prompt(profile, finance, deps, req.language,
                                            correction_notes=correction_notes)

        await callbacks.post_agent_event(project_id, {
            "agentId": agent.agent_id,
            "agentName": agent.agent_name,
            "status": "RUNNING",
            "progress": 40,
            "message": "Génération en cours…",
            "doneCount": counter["done"],
        })

        async with sem:
            is_en = req.language.lower().startswith("en")
            result = await generate_structured(
                agent_name=agent.agent_name,
                system_prompt=prompt,
                output_schema=agent.output_schema,
                tier=agent.tier,
                user_prompt="Launch your analysis now." if is_en else "Lance ton analyse maintenant.",
                max_tokens=agent.max_output_tokens,
                use_web_search=agent.uses_web_search,
                language=req.language,
            )

        outputs[agent.agent_id] = result.payload
        if not is_correction:
            counter["done"] += 1

        await callbacks.post_agent_event(project_id, {
            "agentId": agent.agent_id,
            "agentName": agent.agent_name,
            "status": "DONE",
            "progress": 100,
            "message": "Terminé",
            "doneCount": counter["done"],
            "output": result.payload,
            "modelUsed": result.model_used,
            "tokensInput": result.tokens_input,
            "tokensOutput": result.tokens_output,
            "costEstimateCents": result.cost_estimate_cents,
            "groundingCostCents": result.grounding_cost_cents,
            "sources": result.sources,
            "language": req.language,
        })

    except Exception as e:
        log.exception("project=%s agent=%d failed: %s", project_id, agent.agent_id, e)
        await callbacks.post_agent_event(project_id, {
            "agentId": agent.agent_id,
            "agentName": agent.agent_name,
            "status": "ERROR",
            "progress": 0,
            "message": f"Erreur : {e}",
            "doneCount": counter["done"],
            "errorMessage": str(e),
        })
