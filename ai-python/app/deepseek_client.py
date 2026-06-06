"""
DeepSeek client — drop-in replacement for the previous Anthropic client.

DeepSeek exposes an OpenAI-compatible REST API, so we use the `openai` SDK
pointed at https://api.deepseek.com.

Structured output strategy
───────────────────────────
DeepSeek supports ``response_format={"type": "json_object"}`` (JSON mode).
We embed the agent's JSON Schema directly in the system prompt so the model
always returns a valid JSON object that we parse and return as the payload.
"""
import json
import re
from enum import Enum
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI
from .config import settings


class ModelTier(str, Enum):
    HAIKU = "HAIKU"      # maps to deepseek-chat  (fast / cheap)
    SONNET = "SONNET"    # maps to deepseek-chat  (default)
    OPUS = "OPUS"        # maps to deepseek-reasoner (most capable)


# cents per million tokens (input, output) — DeepSeek pricing (May 2025)
# deepseek-chat:      $0.27 / $1.10  per 1M tokens  → 27 / 110 cents
# deepseek-reasoner:  $0.55 / $2.19  per 1M tokens  → 55 / 219 cents
_COST = {
    ModelTier.HAIKU:   (27,  110),
    ModelTier.SONNET:  (27,  110),
    ModelTier.OPUS:    (55,  219),
}


def estimate_cost_cents(tier: ModelTier, tokens_in: int, tokens_out: int) -> int:
    cin, cout = _COST[tier]
    cents = tokens_in * cin // 1_000_000 + tokens_out * cout // 1_000_000
    return int(cents)


def _model_for(tier: ModelTier) -> str:
    return {
        ModelTier.HAIKU:   settings.model_haiku,
        ModelTier.SONNET:  settings.model_sonnet,
        ModelTier.OPUS:    settings.model_opus,
    }[tier]


@dataclass
class StructuredResponse:
    payload: dict[str, Any]
    tokens_input: int
    tokens_output: int
    cost_estimate_cents: int
    model_used: str  # tier name (HAIKU/SONNET/OPUS)
    grounding_cost_cents: int = 0  # To match existing signature


_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        api_key = settings.deepseek_api_key
        if not api_key:
            raise RuntimeError(
                "DEEPSEEK_API_KEY is not set. "
                "Add it to ai-python/.env and restart the server."
            )
        _client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com",
        )
    return _client


def _schema_instruction(schema: dict[str, Any]) -> str:
    """Append a JSON-Schema block to the system prompt so DeepSeek knows
    exactly what structure to return in JSON mode."""
    return (
        "\n\n---\n"
        "Tu DOIS retourner UNIQUEMENT un objet JSON valide qui respecte "
        "exactement le schéma suivant (sans texte supplémentaire) :\n\n"
        f"```json\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n```"
    )


async def generate_structured(
    *,
    agent_name: str,
    system_prompt: str,
    output_schema: dict[str, Any],
    tier: ModelTier = ModelTier.SONNET,
    user_prompt: str = "Lance ton analyse maintenant.",
    max_tokens: int = 4096,
) -> StructuredResponse:
    model = _model_for(tier)
    full_system = system_prompt + _schema_instruction(output_schema)

    kwargs = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": full_system},
            {"role": "user",   "content": user_prompt},
        ],
    }
    
    # deepseek-reasoner does not support response_format={"type": "json_object"}
    if model == "deepseek-chat":
        kwargs["response_format"] = {"type": "json_object"}

    resp = await _get_client().chat.completions.create(**kwargs)

    raw = resp.choices[0].message.content or ""
    
    # If the model outputs markdown blocks, strip them
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
    json_str = match.group(1) if match else raw

    try:
        payload = json.loads(json_str)
    except json.JSONDecodeError as exc:
        raise RuntimeError(
            f"DeepSeek ({agent_name}): réponse non-JSON — {exc}\n{raw[:500]}"
        ) from exc

    usage = resp.usage
    tokens_in  = usage.prompt_tokens if usage else 0
    tokens_out = usage.completion_tokens if usage else 0

    return StructuredResponse(
        payload=payload,
        tokens_input=tokens_in,
        tokens_output=tokens_out,
        cost_estimate_cents=estimate_cost_cents(tier, tokens_in, tokens_out),
        model_used=tier.value,
        grounding_cost_cents=0,
    )
