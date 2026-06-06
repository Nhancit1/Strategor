"""
Anthropic client.

- Structured output: forced tool_use so Claude returns JSON conforming to each
  agent's JSON Schema (port of the Java ClaudeService).
- Web-search grounding (optional, per agent): a best-effort research pass uses
  Anthropic's server-side web_search tool to gather current facts + sources,
  which are injected into the agent's prompt. Grounding NEVER blocks generation:
  any failure falls back to ungrounded output.
"""
import re
import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import Any
from anthropic import AsyncAnthropic
from .config import settings

log = logging.getLogger("strategor.claude")


class ModelTier(str, Enum):
    HAIKU = "HAIKU"
    SONNET = "SONNET"
    OPUS = "OPUS"


# cents per million tokens (input, output). Rates verified 2026-05:
# Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Opus 4.7 $5/$25.
_COST = {
    ModelTier.HAIKU: (100, 500),
    ModelTier.SONNET: (300, 1500),
    ModelTier.OPUS: (500, 2500),
}


def estimate_cost_cents(tier: ModelTier, tokens_in: int, tokens_out: int) -> int:
    cin, cout = _COST[tier]
    cents = tokens_in * cin // 1_000_000 + tokens_out * cout // 1_000_000
    return int(cents)


def _model_for(tier: ModelTier) -> str:
    return {
        ModelTier.HAIKU: settings.model_haiku,
        ModelTier.SONNET: settings.model_sonnet,
        ModelTier.OPUS: settings.model_opus,
    }[tier]


@dataclass
class StructuredResponse:
    payload: dict[str, Any]
    tokens_input: int
    tokens_output: int
    cost_estimate_cents: int
    model_used: str  # tier name (HAIKU/SONNET/OPUS), matches legacy modelUsed
    grounding_cost_cents: int = 0  # web-search request + research-model cost


_client = AsyncAnthropic(api_key=settings.anthropic_api_key)


# ── Web-search grounding helpers ──────────────────────────────────────────────
def _block_attr(block, key):
    return getattr(block, key, None) if not isinstance(block, dict) else block.get(key)


def _extract_sources(content) -> list[dict]:
    """Pull {title, url} from web_search_tool_result blocks. Defensive: tolerates
    both SDK objects and plain dicts, and silently skips anything unexpected."""
    sources, seen = [], set()
    for block in content or []:
        if _block_attr(block, "type") != "web_search_tool_result":
            continue
        for r in (_block_attr(block, "content") or []):
            url = _block_attr(r, "url")
            title = _block_attr(r, "title")
            if url and url not in seen:
                seen.add(url)
                sources.append({"title": title or url, "url": url})
    return sources


def _count_web_searches(resp) -> int:
    try:
        stu = getattr(resp.usage, "server_tool_use", None)
        n = getattr(stu, "web_search_requests", None) if stu is not None else None
        if n is not None:
            return int(n)
    except Exception:
        pass
    try:
        return sum(1 for b in resp.content if _block_attr(b, "type") == "server_tool_use")
    except Exception:
        return 0


async def _research(context: str) -> tuple[str, list, int]:
    """Best-effort web research. Returns (findings_text, sources, grounding_cost_cents).
    Never raises: on any failure returns ('', [], 0) -> agent falls back to ungrounded."""
    try:
        resp = await _client.messages.create(
            model=settings.model_research,
            max_tokens=2048,
            system=(
                "Tu es un analyste de marché. Recherche sur le web des informations FACTUELLES, "
                "RÉCENTES et CHIFFRÉES pour étayer l'analyse ci-dessous. Privilégie des sources "
                "réputées (presse économique, institutions, rapports sectoriels, sites officiels) ; "
                "évite forums et sources non fiables. Restitue une synthèse dense des faits clés, "
                "chiffres et tendances, en français.\n\n"
                "=== Contexte de l'analyse ===\n" + (context or "")[:2500]
            ),
            messages=[{"role": "user", "content": "Effectue tes recherches et synthétise les faits pertinents."}],
            tools=[{
                "type": settings.web_search_tool_type,
                "name": "web_search",
                "max_uses": settings.web_search_max_uses,
            }],
        )
        text = "".join(
            (_block_attr(b, "text") or "") for b in resp.content
            if _block_attr(b, "type") == "text"
        ).strip()
        sources = _extract_sources(resp.content)
        n = _count_web_searches(resp)
        cost = n * settings.web_search_cost_cents + estimate_cost_cents(
            ModelTier.SONNET, resp.usage.input_tokens, resp.usage.output_tokens
        )
        log.info("web research: %d search(es), %d source(s), %d¢", n, len(sources), cost)
        return text, sources, cost
    except Exception as e:
        log.warning("web research failed: %s", e)
        return "", [], 0


# ── Structured generation ─────────────────────────────────────────────────────
async def generate_structured(
    *,
    agent_name: str,
    system_prompt: str,
    output_schema: dict[str, Any],
    tier: ModelTier = ModelTier.SONNET,
    user_prompt: str = "Lance ton analyse maintenant.",
    max_tokens: int = 4096,
    use_web_search: bool = False,
) -> StructuredResponse:
    model = _model_for(tier)

    grounding_cost = 0
    web_sources: list = []
    if use_web_search and settings.grounding_enabled:
        findings, web_sources, grounding_cost = await _research(system_prompt)
        if findings:
            system_prompt = (
                system_prompt
                + "\n\n=== Données factuelles issues d'une recherche web récente "
                  "(intègre-les et appuie ton analyse dessus) ===\n" + findings + "\n"
            )

    tool_name = "submit_" + re.sub(r"\s+", "_", agent_name.lower())
    resp = await _client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[{
            "name": tool_name,
            "description": "Soumets le résultat de l'analyse au format structuré.",
            "input_schema": output_schema,
        }],
        tool_choice={"type": "tool", "name": tool_name},
    )

    payload = None
    for block in resp.content:
        if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
            payload = block.input
            break
    if payload is None:
        raise RuntimeError(f"Réponse Claude sans tool_use attendu : {tool_name}")

    # Attach gathered sources (post-hoc; not constrained by the agent's schema).
    # The exporters' Sources section reads output.sources / output.citations.
    if web_sources and isinstance(payload, dict) and not payload.get("sources"):
        payload["sources"] = web_sources

    tokens_in = resp.usage.input_tokens
    tokens_out = resp.usage.output_tokens
    return StructuredResponse(
        payload=payload,
        tokens_input=tokens_in,
        tokens_output=tokens_out,
        cost_estimate_cents=estimate_cost_cents(tier, tokens_in, tokens_out),
        model_used=tier.value,
        grounding_cost_cents=grounding_cost,
    )
