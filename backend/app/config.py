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


from urllib.parse import quote_plus

class Settings(BaseSettings):
    postgres_user: str = "capstone"
    postgres_password: str = "changeme"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "capstone"
    
    # Optional override for the entire URL
    database_url_override: str | None = None

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        
        # Safely encode parts
        user = quote_plus(self.postgres_user)
        password = quote_plus(self.postgres_password)
        host = self.postgres_host
        port = self.postgres_port
        db = quote_plus(self.postgres_db)
        
        return f"postgresql://{user}:{password}@{host}:{port}/{db}"

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

    model_config = {
        "env_file": str(_env_file), 
        "extra": "ignore",
        "env_prefix": "", # Ensure it matches .env / env vars exactly
        "fields": {
            "database_url_override": {"env": "DATABASE_URL"}
        }
    }

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
