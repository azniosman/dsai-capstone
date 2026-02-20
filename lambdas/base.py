"""Shared Lambda bootstrap: loads DB credentials from Secrets Manager.

Call bootstrap_env() at the top of each handler module (idempotent — only
runs once per cold start via module-level flag).
"""

import json
import logging
import os

logger = logging.getLogger(__name__)

_bootstrapped = False


def bootstrap_env() -> None:
    """Populate os.environ from Secrets Manager DB secret (idempotent)."""
    global _bootstrapped
    if _bootstrapped:
        return

    secret_arn = os.environ.get("DB_SECRET_ARN")
    if not secret_arn:
        logger.info("DB_SECRET_ARN not set — skipping Secrets Manager bootstrap (local dev)")
        _bootstrapped = True
        return

    try:
        import boto3
        client = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION_ID", "us-east-1"))
        secret_value = client.get_secret_value(SecretId=secret_arn)
        secret = json.loads(secret_value["SecretString"])

        # Map Secrets Manager keys → backend env vars
        mapping = {
            "username": "POSTGRES_USER",
            "password": "POSTGRES_PASSWORD",
            "host": "POSTGRES_HOST",
            "port": "POSTGRES_PORT",
            "dbname": "POSTGRES_DB",
        }
        for sm_key, env_key in mapping.items():
            if sm_key in secret and not os.environ.get(env_key):
                os.environ[env_key] = str(secret[sm_key])

        logger.info("DB credentials loaded from Secrets Manager")
    except Exception as e:
        logger.warning("Secrets Manager bootstrap failed: %s", e)

    _bootstrapped = True
