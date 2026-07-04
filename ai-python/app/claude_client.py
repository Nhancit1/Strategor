"""
Anthropic client.

- Structured output: forced tool_use so Claude returns JSON conforming to each
  agent's JSON Schema (port of the Java ClaudeService).
- Web-search grounding (optional, per agent): a best-effort research pass uses
  Anthropic's server-side web_search tool to gather current facts + sources,
  which are injected into the agent's prompt. Grounding NEVER blocks generation:
  any failure falls back to ungrounded output.
"""
import json
import re
import os
import tempfile
import logging
from enum import Enum
from dataclasses import dataclass, field
from typing import Any
from anthropic import AsyncAnthropic
from .config import settings, CACHE_SENTINEL

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


def _rate_for_model(model_str: str, tier: ModelTier) -> tuple[int, int]:
    """(input, output) cents/Mtok by ACTUAL model — so cost matches the bill even when e.g.
    MODEL_OPUS is mapped to Sonnet. Falls back to the tier's rate if the name is unrecognized."""
    name = (model_str or "").lower()
    if "opus" in name:
        return _COST[ModelTier.OPUS]
    if "haiku" in name:
        return _COST[ModelTier.HAIKU]
    if "sonnet" in name:
        return _COST[ModelTier.SONNET]
    return _COST[tier]


def estimate_cost_cents(tier: ModelTier, tokens_in: int, tokens_out: int,
                        cache_creation_in: int = 0, cache_read_in: int = 0) -> int:
    """Bill-accurate estimate. Prompt-cache writes bill at 1.25x input, reads at 0.1x input."""
    cin, cout = _rate_for_model(_model_for(tier), tier)
    micro = (
        tokens_in * cin
        + (cache_creation_in * cin * 5) // 4   # cache write = 1.25x input
        + (cache_read_in * cin) // 10          # cache read  = 0.10x input
        + tokens_out * cout
    )
    return int(micro // 1_000_000)


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
    sources: list = field(default_factory=list)  # [{title, url}] from grounding research


_client = AsyncAnthropic(api_key=settings.anthropic_api_key)


class GenerationError(RuntimeError):
    """Generation completed (and was billed) but the output was unusable. Carries the
    billed usage so the caller can still account for the tokens that were consumed."""
    tokens_input = 0
    tokens_output = 0
    cost_estimate_cents = 0
    grounding_cost_cents = 0


def _repair_truncated_json(raw: str) -> str | None:
    """Best-effort repair of JSON that was truncated by a max_tokens cutoff.

    Strategy:
      1. Find the first '{' to start the JSON object.
      2. Truncate back to the last complete value boundary (after a ',' or ':' followed
         by a complete value, or after a closing bracket/brace).
      3. Close any remaining open braces/brackets.

    Returns the repaired JSON string, or None if repair is not feasible.
    """
    start = raw.find('{')
    if start == -1:
        return None
    s = raw[start:]

    # Walk character by character tracking nesting and string state
    stack: list[str] = []  # tracks [ and {
    in_string = False
    escape = False
    last_good = -1  # index of last position that ended a complete value

    for i, ch in enumerate(s):
        if escape:
            escape = False
            continue
        if in_string:
            if ch == '\\':
                escape = True
            elif ch == '"':
                in_string = False
                last_good = i
            continue
        # Outside string
        if ch == '"':
            in_string = True
        elif ch in ('{', '['):
            stack.append(ch)
        elif ch == '}':
            if stack and stack[-1] == '{':
                stack.pop()
                last_good = i
        elif ch == ']':
            if stack and stack[-1] == '[':
                stack.pop()
                last_good = i
        elif ch in (',', ':'):
            pass  # structural, not a value end
        elif ch in (' ', '\t', '\n', '\r'):
            pass

    if not stack:
        # Already balanced — shouldn't happen for a truncated output, but try it
        try:
            json.loads(s)
            return s
        except Exception:
            pass

    if last_good == -1:
        return None

    # Truncate to last_good, then strip any trailing comma / colon / whitespace
    truncated = s[:last_good + 1].rstrip()
    # Remove a trailing comma that would be invalid before a closing bracket
    while truncated and truncated[-1] in (',', ':'):
        truncated = truncated[:-1].rstrip()

    # Re-scan to find what's still open after truncation
    stack2: list[str] = []
    in_str2 = False
    esc2 = False
    for ch in truncated:
        if esc2:
            esc2 = False
            continue
        if in_str2:
            if ch == '\\':
                esc2 = True
            elif ch == '"':
                in_str2 = False
            continue
        if ch == '"':
            in_str2 = True
        elif ch in ('{', '['):
            stack2.append(ch)
        elif ch == '}':
            if stack2 and stack2[-1] == '{':
                stack2.pop()
        elif ch == ']':
            if stack2 and stack2[-1] == '[':
                stack2.pop()

    # Close everything that's still open (in reverse order)
    closers = {'[': ']', '{': '}'}
    suffix = ''.join(closers[c] for c in reversed(stack2))
    repaired = truncated + suffix

    try:
        json.loads(repaired)
        return repaired
    except Exception:
        return None


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


async def _research(context: str, language: str = "fr") -> tuple[str, list, int]:
    """Best-effort web research. Returns (findings_text, sources, grounding_cost_cents).
    Never raises: on any failure returns ('', [], 0) -> agent falls back to ungrounded."""
    try:
        is_en = language.lower().startswith("en")
        system_instruction = (
            "You are a market analyst. Search the web for FACTUAL, RECENT, and QUANTITATIVE information to support the analysis below. "
            "Prioritize reputable sources (financial press, institutions, industry reports, official websites); avoid forums and unreliable sources. "
            "Provide a dense synthesis of key facts, figures, and trends in English.\n\n"
            "=== Analysis Context ===\n" + (context or "")[:2500]
        ) if is_en else (
            "Tu es un analyste de marché. Recherche sur le web des informations FACTUELLES, "
            "RÉCENTES et CHIFFRÉES pour étayer l'analyse ci-dessous. Privilégie des sources "
            "réputées (presse économique, institutions, rapports sectoriels, sites officiels) ; "
            "évite forums et sources non fiables. Restitue une synthèse dense des faits clés, "
            "chiffres et tendances, en français.\n\n"
            "=== Contexte de l'analyse ===\n" + (context or "")[:2500]
        )
        resp = await _client.messages.create(
            model=settings.model_research,
            max_tokens=2048,
            system=system_instruction,
            messages=[{"role": "user", "content": "Perform your research and synthesize the relevant facts." if is_en else "Effectue tes recherches et synthétise les faits pertinents."}],
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
    language: str = "fr",
) -> StructuredResponse:
    model = _model_for(tier)

    grounding_cost = 0
    web_sources: list = []
    if use_web_search and settings.grounding_enabled:
        findings, web_sources, grounding_cost = await _research(system_prompt, language)
        if findings:
            is_en = language.lower().startswith("en")
            system_prompt = (
                system_prompt
                + ("\n\n=== Factual data from recent web research (integrate this into your analysis) ===\n" + findings + "\n")
                if is_en else
                (system_prompt + "\n\n=== Données factuelles issues d'une recherche web récente (intègre-les et appuie ton analyse dessus) ===\n" + findings + "\n")
            )

    # Anthropic requires tool names to match ^[a-zA-Z0-9_-]{1,128}$
    # → normalize unicode accents, then strip anything that's not a-z/0-9/underscore.
    import unicodedata
    _raw = unicodedata.normalize("NFD", agent_name.lower())
    _ascii = _raw.encode("ascii", "ignore").decode("ascii")  # drop accents
    tool_name = "submit_" + re.sub(r"[^a-z0-9]+", "_", _ascii).strip("_")[:100]

    # Forced tool_use replaces the old "reply with a ```json block" contract: the schema
    # now travels in the tools param (not duplicated in the prompt), and the model's output
    # is structurally constrained — no markdown fences to strip, far fewer parse failures.
    is_en = language.lower().startswith("en")
    if is_en:
        system_prompt += (
            "\n\nSubmit your complete analysis via the provided tool. "
            "ABSOLUTE RULE: BE EXTREMELY CONCISE. Short phrases and keywords over prose; write only the essentials."
        )
    else:
        system_prompt += (
            "\n\nSoumets ton analyse complète via l'outil fourni. "
            "RÈGLE ABSOLUE : SOIS EXTRÊMEMENT CONCIS. Phrases courtes et mots-clés plutôt que de la prose ; rédige l'essentiel uniquement."
        )
    submit_tool = {
        "name": tool_name,
        "description": ("Submit the structured result of the analysis."
                        if is_en else "Soumettre le résultat structuré de l'analyse."),
        "input_schema": output_schema,
    }

    # Prompt caching: split at the sentinel into a cached shared prefix + a per-agent suffix.
    if settings.prompt_cache_enabled and CACHE_SENTINEL in system_prompt:
        _prefix, _suffix = system_prompt.split(CACHE_SENTINEL, 1)
        system_param = [
            {"type": "text", "text": _prefix, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": _suffix},
        ]
    else:
        system_param = system_prompt.replace(CACHE_SENTINEL, "")

    resp = await _client.messages.create(
        model=model,
        max_tokens=max_tokens,            # honor each agent's configured output cap
        system=system_param,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[submit_tool],
        tool_choice={"type": "tool", "name": tool_name},
    )

    # Usage + bill-accurate cost (incl. prompt-cache tokens), computed up front so a
    # post-generation failure can still report what was billed.
    _u = resp.usage
    tokens_in = _u.input_tokens
    tokens_out = _u.output_tokens
    cache_create = getattr(_u, "cache_creation_input_tokens", 0) or 0
    cache_read = getattr(_u, "cache_read_input_tokens", 0) or 0
    cost = estimate_cost_cents(tier, tokens_in, tokens_out, cache_create, cache_read)
    total_in = tokens_in + cache_create + cache_read

    def _gen_error(msg: str) -> GenerationError:
        e = GenerationError(msg)
        e.tokens_input = total_in
        e.tokens_output = tokens_out
        e.cost_estimate_cents = cost
        e.grounding_cost_cents = grounding_cost
        return e

    # Detect output truncation (stop_reason == "max_tokens" means the response was cut
    # off before Claude finished generating).
    stop_reason = getattr(resp, "stop_reason", None)
    was_truncated = stop_reason == "max_tokens"
    if was_truncated:
        log.warning("agent=%s output TRUNCATED (hit max_tokens=%d). Will attempt JSON repair.", agent_name, max_tokens)

    # Primary path: the forced tool_use block carries the structured payload directly.
    payload = None
    text = ""
    for block in resp.content:
        btype = getattr(block, "type", None)
        if btype == "tool_use" and getattr(block, "name", "") == tool_name:
            payload = block.input
        elif btype == "text":
            text += block.text

    if isinstance(payload, dict) and payload:
        pass  # structured payload extracted — skip the legacy text-parsing path
    else:
        # Fallback (e.g. max_tokens truncation cut the tool block): legacy extraction + repair.
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            json_str = match.group(1)
        else:
            json_str = text.strip()
            start = json_str.find('{')
            end = json_str.rfind('}')
            if start != -1 and end != -1:
                json_str = json_str[start:end + 1]
        payload = None
        try:
            payload = json.loads(json_str)
        except Exception as parse_err:
            # Attempt to repair the JSON by closing unclosed brackets/braces at
            # the last structurally-valid point (max_tokens truncation of the tool block).
            log.info("agent=%s JSON parse failed (truncated=%s), attempting repair…", agent_name, was_truncated)
            repaired = _repair_truncated_json(text)
            if repaired:
                try:
                    payload = json.loads(repaired)
                    log.info("agent=%s JSON repair succeeded (partial data recovered).", agent_name)
                except Exception:
                    pass
            if payload is None:
                # Write debug output to a SAFE filename inside the system temp dir.
                # agent_name is sanitized so it can never escape the directory (path traversal).
                try:
                    safe_name = re.sub(r"[^A-Za-z0-9_-]+", "_", str(agent_name))[:50] or "agent"
                    dbg_path = os.path.join(tempfile.gettempdir(), f"debug_resp_{safe_name}.log")
                    with open(dbg_path, "w", encoding="utf-8") as f:
                        f.write(text)
                except Exception:
                    pass  # debug logging must never break the request
                raise _gen_error(f"Claude n'a pas renvoyé un JSON valide pour l'agent {agent_name}. Erreur: {parse_err}")

    if not payload:
        raise _gen_error(f"Claude a renvoyé un objet vide {{}} pour l'agent {agent_name}. Rejet de la réponse.")

    # Validate that required keys from the schema are present
    required_keys = output_schema.get("required", [])
    if isinstance(payload, dict) and required_keys:
        missing_keys = [k for k in required_keys if k not in payload]
        if missing_keys:
            raise _gen_error(f"Claude a omis des champs obligatoires ({', '.join(missing_keys)}) pour l'agent {agent_name}.")

    # Attach gathered sources (post-hoc; not constrained by the agent's schema).
    # The exporters' Sources section reads output.sources / output.citations.
    if web_sources and isinstance(payload, dict) and not payload.get("sources"):
        payload["sources"] = web_sources

    return StructuredResponse(
        payload=payload,
        tokens_input=total_in,
        tokens_output=tokens_out,
        cost_estimate_cents=cost,
        model_used=tier.value,
        grounding_cost_cents=grounding_cost,
        sources=web_sources,
    )
