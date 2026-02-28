"""
Lambda handler — NestJS Lambda warm-up ping.

Invokes the NestJS backend Lambda with a lightweight ``GET /internal/health``
request every 5 minutes during active hours, preventing cold starts for users.

Invoked by EventBridge Scheduler:
  - rate(5 minutes): Continuous — runs 8,640 times/month (within free tier).

Event payload:
  {
    "task": "warmup_ping",
    "backend_function": "skillbridge-prod-backend"
  }

CMD override: lambdas.automation.lambda_warmup.handler
"""

import json
import logging
import os
import time

import boto3

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    """
    Ping the NestJS backend Lambda to prevent cold starts.

    Unlike other automation handlers, this function invokes the backend
    Lambda directly (without ``call_internal_endpoint``) because:
    1. The ``/health`` endpoint does not require the X-Internal-Token header.
    2. We want to measure raw invocation latency, not add Secrets Manager
       overhead to the measurement.

    Args:
        event: EventBridge scheduler event. May contain ``backend_function``.
        context: Lambda context object (unused).

    Returns:
        A standard Lambda HTTP response dict with measured latency.
    """
    backend_function: str = event.get(
        "backend_function",
        os.environ.get("BACKEND_FUNCTION_NAME", "skillbridge-prod-backend"),
    )

    logger.info("Sending warm-up ping to: %s", backend_function)
    start = time.time()

    try:
        client = boto3.client("lambda")
        response = client.invoke(
            FunctionName=backend_function,
            InvocationType="RequestResponse",
            Payload=json.dumps(
                {
                    "httpMethod": "GET",
                    "path": "/internal/health",
                    "headers": {},
                    "body": "",
                    "isBase64Encoded": False,
                }
            ).encode(),
        )

        latency_ms: float = (time.time() - start) * 1000
        status_code: int = response.get("StatusCode", 500)

        # Emit latency as a CloudWatch metric for alarming on high cold-start values.
        try:
            cw = boto3.client("cloudwatch")
            cw.put_metric_data(
                Namespace="SkillBridgeAutomation",
                MetricData=[
                    {
                        "MetricName": "WarmupLatencyMs",
                        "Value": latency_ms,
                        "Unit": "Milliseconds",
                    }
                ],
            )
        except Exception as metric_exc:
            logger.warning("Failed to emit warmup metric: %s", metric_exc)

        logger.info(
            "Warm-up ping complete: function=%s latency_ms=%.0f status=%d",
            backend_function,
            latency_ms,
            status_code,
        )
        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "backend_function": backend_function,
                    "latency_ms": round(latency_ms),
                    "backend_status_code": status_code,
                }
            ),
        }

    except Exception as exc:
        logger.error("Warm-up ping failed: error=%s", exc, exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(exc)}),
        }
