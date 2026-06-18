"""
Self-correction loop — closes the consistency loop.

The pipeline detects inconsistencies (deterministic validator + Agent 15) but, until
now, did nothing with them: the report went to the user and the agents that produced
the contradictions were never corrected. This module turns *detection into remediation*.

Flow (bounded + guarded):
  1. Map findings -> implicated agents:
        - deterministic ERRORS (objective, from numeric_integrity.checks[].agents)
        - Agent 15 HIGH/MEDIUM inconsistencies (from outputs[15].inconsistencies)
  2. Regenerate ONLY those agents, in topological order, injecting the specific findings
     as correction instructions. Excludes Agent 1 (human-reviewed) and Agent 15 (reviewer).
  3. Re-run the deterministic validator (cheap). Repeat until zero errors or a round cap.
  4. Refresh Agent 15 once on the corrected outputs so the semantic review isn't stale.
  5. Attach a full audit trail (`corrections`) to the report for transparency.

Never raises — a failure leaves the original report intact. `regenerate(agent, notes)`
is injected by the orchestrator (a closure over _run_one_agent) to avoid a circular import.
"""
from __future__ import annotations

import logging
import re
from typing import Awaitable, Callable, Optional

from .numeric_integrity import check_numeric_integrity
from .agents.registry import get_or_raise, active_for_mode, build_execution_levels
from .config import settings

log = logging.getLogger("strategor.self_correction")

AGENT15_ID = 15
# Never auto-regenerated: Agent 1 (human-reviewed profile) and Agent 15 (the reviewer).
_NON_REGENERABLE = {1, AGENT15_ID}


def _ids_from_text(s: str) -> list[int]:
    return [int(x) for x in re.findall(r"\d+", s or "")]


def _targets_from_report(report: dict, outputs: dict, include_semantic: bool) -> dict[int, list[str]]:
    """agent_id -> correction notes, from deterministic errors (+ Agent 15 HIGH/MEDIUM on round 1)."""
    notes: dict[int, list[str]] = {}

    for c in report.get("checks", []):
        if c.get("severity") != "error":
            continue
        msg = c.get("detail") or c.get("title") or ""
        for aid in c.get("agents", []):
            try:
                notes.setdefault(int(aid), []).append(msg)
            except (TypeError, ValueError):
                pass

    if include_semantic:
        a15 = outputs.get(AGENT15_ID)
        if isinstance(a15, dict):
            for it in (a15.get("inconsistencies") or []):
                if not isinstance(it, dict):
                    continue
                if str(it.get("severity", "")).upper() not in ("HIGH", "MEDIUM"):
                    continue
                desc = (it.get("description") or "").strip()
                fix = (it.get("suggested_fix") or "").strip()
                full = f"{desc} → correction suggérée : {fix}" if fix else desc
                for aid in _ids_from_text(" ".join(map(str, it.get("agents_involved", []) or []))):
                    notes.setdefault(aid, []).append(full)

    for aid in [a for a in notes if a in _NON_REGENERABLE or a < 0]:
        notes.pop(aid, None)
    return notes


def _topo_order(mode: str, ids: set[int]) -> list[int]:
    """Implicated ids in global execution (dependency) order, so upstream fixes propagate."""
    try:
        levels = build_execution_levels(active_for_mode(mode))
        order = [a.agent_id for lvl in levels for a in lvl]
    except Exception:
        order = sorted(ids)
    return [aid for aid in order if aid in ids]


def _dependents_map(mode: str) -> dict[int, set[int]]:
    """agent_id -> ids that directly declare it as a dependency, for the active mode."""
    agents = active_for_mode(mode)
    dmap: dict[int, set[int]] = {a.agent_id: set() for a in agents}
    for a in agents:
        for dep_id in a.depends_on:
            if dep_id in dmap:
                dmap[dep_id].add(a.agent_id)
    return dmap


def _cascade_dependents(targets: dict[int, list[str]], mode: str) -> dict[int, list[str]]:
    """Graph-aware correction: once an agent is corrected, everything downstream of it is
    potentially stale too. Expand the target set with the *transitive* dependents of every
    implicated agent (still excluding the non-regenerable ones), so a fix to e.g. the BCG also
    refreshes the strategy, deliverables and reviews built on top of it. Bounded afterwards by
    the per-round cap, and regenerated in topological order so upstream fixes land first."""
    try:
        dmap = _dependents_map(mode)
    except Exception:
        return targets
    seen = set(targets)
    queue = list(targets)
    while queue:
        cur = queue.pop()
        for dep_id in dmap.get(cur, ()):
            if dep_id in _NON_REGENERABLE or dep_id < 0:
                continue
            if dep_id not in seen:
                seen.add(dep_id)
                queue.append(dep_id)
            if dep_id not in targets:
                targets.setdefault(dep_id, []).append(
                    f"Une de tes dépendances (agent {cur}) a été corrigée : réaligne tes "
                    "chiffres, jalons et conclusions sur sa version corrigée."
                )
    return targets


async def run_self_correction(
    req, outputs: dict, profile: Optional[dict], finance: Optional[dict],
    report: dict, regenerate: Callable[..., Awaitable[None]],
) -> dict:
    """Drive findings -> targeted regeneration -> re-validate, capped. Returns final report."""
    mode = req.mode or "standard"
    max_rounds = max(1, settings.self_correction_max_rounds)
    cap = max(1, settings.self_correction_max_agents_per_round)
    errors_initial = report["summary"]["errors"]
    rounds_log: list[dict] = []
    regenerated: list[int] = []

    try:
        for rnd in range(1, max_rounds + 1):
            targets = _targets_from_report(report, outputs, include_semantic=(rnd == 1))
            if not targets:
                break
            # Graph-aware: also refresh everything declared downstream of the corrected agents.
            targets = _cascade_dependents(targets, mode)
            ordered = _topo_order(mode, set(targets))[:cap]
            if not ordered:
                break

            errors_before = report["summary"]["errors"]
            for aid in ordered:
                try:
                    agent = get_or_raise(aid)
                except KeyError:
                    continue
                # dedup notes, preserve order
                note_block = "\n".join(f"- {n}" for n in dict.fromkeys(targets[aid]) if n)
                try:
                    await regenerate(agent, note_block)
                    regenerated.append(aid)
                except Exception as e:
                    log.warning("self-correction: agent %d regen failed: %s", aid, e)

            report = check_numeric_integrity(outputs, profile, finance)
            rounds_log.append({
                "round": rnd,
                "regenerated": ordered,
                "errors_before": errors_before,
                "errors_after": report["summary"]["errors"],
            })
            if report["summary"]["errors"] == 0:
                break

        # Refresh the semantic review once on the corrected outputs (if Agent 15 ran).
        if regenerated and AGENT15_ID in outputs:
            try:
                await regenerate(get_or_raise(AGENT15_ID), None)
                report = check_numeric_integrity(outputs, profile, finance)
            except Exception as e:
                log.warning("self-correction: Agent 15 refresh failed: %s", e)
    except Exception as e:  # pragma: no cover — loop must never break the pipeline
        log.warning("self-correction loop aborted: %s", e)

    report["corrections"] = {
        "enabled": True,
        "rounds": rounds_log,
        "regenerated_agents": sorted(set(regenerated)),
        "errors_initial": errors_initial,
        "errors_final": report["summary"]["errors"],
        "converged": report["summary"]["errors"] == 0,
    }
    return report
