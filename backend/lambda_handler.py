"""
Lambda entry point for the SkillBridge FastAPI backend.

Uses Mangum to wrap the FastAPI ASGI app for AWS Lambda + API Gateway v2
(HTTP API, payload format version 2.0).

Cold-start sequence:
  1. _bootstrap_env() — fetch DB credentials from Secrets Manager and set
     POSTGRES_* environment variables so SQLAlchemy can connect.
  2. Import app.main (FastAPI app construction, router registration).
  3. handler = Mangum(app) — adapter that translates Lambda events ↔ ASGI.

Subsequent warm invocations skip steps 1–2 (module is already loaded).
"""

from __future__ import annotations

import json
import logging
import os

logger = logging.getLogger(__name__)


def _bootstrap_env() -> None:
    """Fetch DB credentials from Secrets Manager and populate env vars.

    Called once at module load (cold start). Idempotent: returns immediately
    if POSTGRES_PASSWORD is already set.
    """
    secret_arn = os.environ.get("DB_SECRET_ARN")
    if not secret_arn:
        logger.info("DB_SECRET_ARN not set — using env vars directly (local dev mode)")
        return

    # Skip if already bootstrapped (e.g. warm invocation or local override)
    if os.environ.get("POSTGRES_PASSWORD"):
        return

    try:
        import boto3

        region = (
            os.environ.get("AWS_REGION_ID")
            or os.environ.get("AWS_DEFAULT_REGION")
            or "us-east-1"
        )
        client = boto3.client("secretsmanager", region_name=region)
        response = client.get_secret_value(SecretId=secret_arn)
        secret: dict = json.loads(response["SecretString"])

        os.environ.setdefault("POSTGRES_USER", secret.get("username", "skillbridge"))
        os.environ.setdefault("POSTGRES_PASSWORD", secret.get("password", ""))
        os.environ.setdefault(
            "POSTGRES_HOST",
            secret.get("host", os.environ.get("POSTGRES_HOST", "localhost")),
        )
        os.environ.setdefault("POSTGRES_PORT", str(secret.get("port", 5432)))
        os.environ.setdefault("POSTGRES_DB", secret.get("dbname", "skillbridge"))

        # Provide a full DATABASE_URL as a convenience for SQLAlchemy
        if not os.environ.get("DATABASE_URL"):
            url = secret.get("url") or (
                "postgresql://{username}:{password}@{host}:{port}/{dbname}".format(**secret)
            )
            os.environ["DATABASE_URL"] = url

        logger.info("DB credentials loaded from Secrets Manager (host=%s)", secret.get("host"))

    except Exception as exc:  # pragma: no cover
        # Log but don't crash — SQLAlchemy will raise a clearer error on connect
        logger.error("Failed to load DB secret %s: %s", secret_arn, exc)


# Bootstrap must run before importing app (which initialises DB engine on import)
_bootstrap_env()

import threading  # noqa: E402

from app.main import app, _seed_database, _background_ml_warmup  # noqa: E402

from mangum import Mangum  # noqa: E402

# Initialise DB schema + seed data during Lambda cold start (module-level).
# Mangum lifespan="off" means the FastAPI startup event never fires, so we
# call _seed_database() explicitly after _bootstrap_env() has set credentials.
# Idempotent: create_all() is a no-op when tables already exist.
try:
    _seed_database()
    logger.info("DB initialisation complete")
except Exception as exc:
    logger.error("DB initialisation failed: %s", exc)

# Pre-load ML model + FAISS index in the background so the first recommender /
# jd-match / skill-gap request doesn't hit a cold model-load penalty.
# Daemon thread: exits automatically if Lambda container is recycled.
threading.Thread(target=_background_ml_warmup, daemon=True, name="ml-warmup").start()

handler = Mangum(app, lifespan="off")
