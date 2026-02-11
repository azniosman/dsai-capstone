import json
import os

from pydantic_settings import BaseSettings
from pydantic import model_validator


class Settings(BaseSettings):
    database_url: str = "postgresql://capstone:changeme@localhost:5432/capstone"
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

    @model_validator(mode="after")
    def parse_database_url(self):
        """Parse Secrets Manager JSON into a proper connection string."""
        if self.database_url.startswith("{"):
            creds = json.loads(self.database_url)
            host = creds["host"].split(":")[0]
            port = creds.get("port", "5432")
            self.database_url = (
                f"postgresql://{creds['username']}:{creds['password']}"
                f"@{host}:{port}/{creds['dbname']}"
            )
        return self


settings = Settings()
