import json
import os

from pydantic_settings import BaseSettings


def _build_database_url() -> str:
    """Build DATABASE_URL from env var or Secrets Manager JSON."""
    raw = os.getenv("DATABASE_URL", "")
    if raw:
        # If it looks like JSON (from Secrets Manager), parse it
        if raw.startswith("{"):
            creds = json.loads(raw)
            return (
                f"postgresql://{creds['username']}:{creds['password']}"
                f"@{creds['host']}:{creds.get('port', '5432')}/{creds['dbname']}"
            )
        return raw
    return "postgresql://capstone:changeme@localhost:5432/capstone"


class Settings(BaseSettings):
    database_url: str = _build_database_url()
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # Auth
    secret_key: str = "change-me-in-production-use-a-real-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # LLM (OpenAI-compatible)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    model_config = {"env_file": ".env"}


settings = Settings()
