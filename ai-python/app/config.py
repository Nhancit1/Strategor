import os
from pathlib import Path
from dotenv import load_dotenv

# Always load the .env next to this file's package root (ai-python/.env)
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_env_path, override=True)


class Settings:
    # Anthropic
    anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
    model_haiku: str = os.getenv("MODEL_HAIKU", "claude-3-haiku-20240307")
    model_sonnet: str = os.getenv("MODEL_SONNET", "claude-3-5-sonnet-20241022")
    model_opus: str = os.getenv("MODEL_OPUS", "claude-3-opus-20240229")

    # Node backend callbacks
    node_url: str = os.getenv("NODE_URL", "http://localhost:4000")
    internal_token: str = os.getenv("INTERNAL_TOKEN", "dev-internal-token-change-me")

    # Concurrency: max agents running in parallel within a level
    max_parallel_agents: int = int(os.getenv("MAX_PARALLEL_AGENTS", "5"))

    # PDF engine: "weasyprint" (pure-python, default) or "chromium"
    pdf_engine: str = os.getenv("PDF_ENGINE", "weasyprint")
    chromium_path: str = os.getenv("CHROMIUM_PATH", "chromium")


settings = Settings()

