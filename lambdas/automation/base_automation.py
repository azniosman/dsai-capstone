"""
Shared utilities for all EventBridge automation Lambda handlers.

Provides:
  - call_internal_endpoint(): Authenticated Lambda Invoke call to the
      NestJS backend, resolving internal endpoints without going through
      the public API Gateway.
  - emit_metric(): Publishes a custom CloudWatch metric to the
      ``SkillBridgeAutomation`` namespace.
  - get_internal_token(): Retrieves the shared secret from Secrets Manager
      with in-memory caching to minimise API calls.
"""

import json
import logging
import os
from typing import Any

import boto3

logger = logging.getLogger(__name__)

# ─── Configuration ──────────────────────────────────────────────────────────

BACKEND_FUNCTION_NAME: str = os.environ.get(
    "BACKEND_FUNCTION_NAME", "skillbridge-prod-backend"
)
INTERNAL_TOKEN_SECRET_ARN: str = os.environ.get("INTERNAL_TOKEN_SECRET_ARN", "")
CLOUDWATCH_NAMESPACE: str = "SkillBridgeAutomation"

# Module-level token cache — persists across warm invocations.
_cached_token: str | None = None


# ─── Secrets Manager ────────────────────────────────────────────────────────


def get_internal_token() -> str:
    """
    Retrieve the internal automation token from AWS Secrets Manager.

    The token is cached in module scope so subsequent invocations within the
    same Lambda execution environment do not incur an additional API call.

    Returns:
        The X-Internal-Token secret string.

    Raises:
        RuntimeError: If the secret ARN is not configured or retrieval fails.
    """
    global _cached_token
    if _cached_token:
        return _cached_token

    if not INTERNAL_TOKEN_SECRET_ARN:
        raise RuntimeError(
            "INTERNAL_TOKEN_SECRET_ARN is not set. "
            "Deploy the Terraform eventbridge module first."
        )

    sm = boto3.client("secretsmanager")
    response = sm.get_secret_value(SecretId=INTERNAL_TOKEN_SECRET_ARN)
    secret = json.loads(response["SecretString"])
    _cached_token = secret["token"]
    return _cached_token


# ─── Lambda Invoke ──────────────────────────────────────────────────────────


def call_internal_endpoint(
    path: str,
    method: str = "POST",
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Invoke the NestJS backend Lambda directly via the Lambda Invoke API.

    This approach keeps ``/internal/...`` endpoints completely off the public
    internet — no API Gateway route registration is required.

    Args:
        path: The HTTP path to invoke, e.g. ``/internal/cache/cleanup``.
        method: HTTP method (default ``POST``).
        body: Optional request body serialised to JSON.

    Returns:
        The parsed JSON body from the Lambda response payload.

    Raises:
        RuntimeError: If the Lambda function returns a FunctionError.
    """
    token = get_internal_token()
    payload = {
        "httpMethod": method,
        "path": path,
        "headers": {
            "x-internal-token": token,
            "content-type": "application/json",
        },
        "body": json.dumps(body or {}),
        "isBase64Encoded": False,
    }

    client = boto3.client("lambda")
    response = client.invoke(
        FunctionName=BACKEND_FUNCTION_NAME,
        InvocationType="RequestResponse",
        Payload=json.dumps(payload).encode(),
    )

    if response.get("FunctionError"):
        raw = json.loads(response["Payload"].read())
        raise RuntimeError(f"Backend Lambda error ({response['FunctionError']}): {raw}")

    result = json.loads(response["Payload"].read())
    # The NestJS Lambda wraps the response in {statusCode, body}
    if isinstance(result.get("body"), str):
        return json.loads(result["body"])
    return result.get("body", result)


# ─── CloudWatch Metrics ─────────────────────────────────────────────────────


def emit_metric(
    metric_name: str,
    value: float,
    unit: str = "Count",
) -> None:
    """
    Publish a custom CloudWatch metric to the ``SkillBridgeAutomation`` namespace.

    Args:
        metric_name: The name of the metric (e.g. ``CacheRowsDeleted``).
        value: The numeric value to record.
        unit: The CloudWatch unit string (default ``Count``).
    """
    try:
        cw = boto3.client("cloudwatch")
        cw.put_metric_data(
            Namespace=CLOUDWATCH_NAMESPACE,
            MetricData=[
                {
                    "MetricName": metric_name,
                    "Value": value,
                    "Unit": unit,
                }
            ],
        )
    except Exception as exc:
        # Non-fatal — metric emission failure should never fail an automation run.
        logger.warning("Failed to emit CloudWatch metric %s: %s", metric_name, exc)
