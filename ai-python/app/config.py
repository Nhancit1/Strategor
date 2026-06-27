import os
from pathlib import Path
from dotenv import load_dotenv

# Always load the .env next to this file's package root (ai-python/.env)
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)


class Settings:
    # Anthropic
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    model_haiku: str = os.getenv("MODEL_HAIKU", "claude-haiku-4-5")
    model_sonnet: str = os.getenv("MODEL_SONNET", "claude-sonnet-4-5")
    model_opus: str = os.getenv("MODEL_OPUS", "claude-sonnet-4-5")  # Opus deprecated; fallback to Sonnet

    # Node backend callbacks
    node_url: str = os.getenv("NODE_URL", "http://localhost:4000")
    internal_token: str = os.getenv("INTERNAL_TOKEN", "dev-internal-token-change-me")

    # Only files under this root may be read by the parser (same shared volume as Node's
    # UPLOAD_PATH). Anything outside is refused -> blocks path traversal / arbitrary file read.
    storage_root: str = os.getenv("UPLOAD_PATH", "/tmp/strategor-uploads")

    # API docs (/docs, /redoc, /openapi.json) are DISABLED by default — this is an internal
    # service, the schema should not be public. Set AI_DOCS_ENABLED=true only for local dev.
    docs_enabled: bool = os.getenv("AI_DOCS_ENABLED", "false").lower() == "true"
    # Optional Host allow-list (comma-separated). Empty = no restriction.
    allowed_hosts: list[str] = [h.strip() for h in os.getenv("AI_ALLOWED_HOSTS", "").split(",") if h.strip()]

    # Concurrency: max agents running in parallel within a level
    max_parallel_agents: int = int(os.getenv("MAX_PARALLEL_AGENTS", "5"))

    # PDF engine: "weasyprint" (pure-python, default) or "chromium"
    pdf_engine: str = os.getenv("PDF_ENGINE", "weasyprint")
    chromium_path: str = os.getenv("CHROMIUM_PATH", "chromium")

    # Web-search grounding (agents 2,4,5,9,11 enrich with current web facts)
    grounding_enabled: bool = os.getenv("GROUNDING_ENABLED", "true").lower() == "true"
    web_search_max_uses: int = int(os.getenv("WEB_SEARCH_MAX_USES", "5"))
    web_search_cost_cents: int = int(os.getenv("WEB_SEARCH_COST_CENTS", "1"))
    model_research: str = os.getenv("MODEL_RESEARCH", "claude-sonnet-4-5")
    web_search_tool_type: str = os.getenv("WEB_SEARCH_TOOL_TYPE", "web_search")

    # Self-correction loop: regenerate agents implicated by consistency findings, then
    # re-validate. Bounded by rounds + agents/round to cap cost. Set ENABLED=false to disable.
    self_correction_enabled: bool = os.getenv("SELF_CORRECTION_ENABLED", "true").lower() == "true"
    self_correction_max_rounds: int = int(os.getenv("SELF_CORRECTION_MAX_ROUNDS", "2"))
    self_correction_max_agents_per_round: int = int(os.getenv("SELF_CORRECTION_MAX_AGENTS", "6"))

    # Prompt caching: cache the shared, stable prompt prefix (company fact-sheet + rules)
    # so it is billed once per ~5 min instead of re-sent in full for every agent and every
    # regeneration. Best-effort — Anthropic ignores it when the prefix is below the min length.
    prompt_cache_enabled: bool = os.getenv("PROMPT_CACHE_ENABLED", "true").lower() == "true"


settings = Settings()

# Refuse to boot with the default internal token — it is publicly known and would leave the
# Node<->Python internal door open. Fail fast; require a real INTERNAL_TOKEN from .env.
if settings.internal_token == "dev-internal-token-change-me":
    raise RuntimeError(
        "Refuse to start with the default INTERNAL_TOKEN. "
        "Set a strong INTERNAL_TOKEN in .env (e.g. `openssl rand -hex 32`)."
    )

# Marker inserted by build_system_prompt at the cache boundary; the client splits the
# system prompt here into a cached prefix + a per-agent suffix. Never shown to the model.
CACHE_SENTINEL = "\u0000__STRATEGOR_CACHE_BREAKPOINT__\u0000"

