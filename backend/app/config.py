import logging
from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import model_validator

logger = logging.getLogger(__name__)

_DEFAULT_SECRET = "change-me-in-production-use-a-real-secret"

# Locate .env: check CWD first, then parent (project root)
_env_file = Path(".env")
if not _env_file.exists():
    _parent_env = Path(__file__).resolve().parent.parent.parent / ".env"
    if _parent_env.exists():
        _env_file = _parent_env


class Settings(BaseSettings):
    database_url: str = "postgresql://capstone:changeme@localhost:5432/capstone"
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000

    # Auth
    secret_key: str = _DEFAULT_SECRET
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    sso_enabled: bool = False

    # Environment
    environment: str = "development"

    # LLM (Gemini)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    model_config = {"env_file": str(_env_file), "extra": "ignore"}

    @model_validator(mode="after")
    def validate_secret_key(self):
        """Refuse to start with default secret in production."""
        if self.secret_key == _DEFAULT_SECRET:
            if self.environment == "production":
                raise ValueError(
                    "SECRET_KEY must be changed from default in production. "
                    "Set a strong random SECRET_KEY environment variable."
                )
            logger.warning(
                "Using default SECRET_KEY — set a strong random value before deploying."
            )
        return self


settings = Settings()
