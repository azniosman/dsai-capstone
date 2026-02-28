"""
Lambda handler — Recommendation score pre-computation and LLM rationale
pre-generation.

Handles two related EventBridge schedules:
  - cron(0 2 * * ? *):   task=precompute_scores   (02:00 UTC daily)
  - cron(30 2 * * ? *):  task=pregen_rationale     (02:30 UTC daily)

Event payload:
  {
    "task": "precompute_scores" | "pregen_rationale",
    "endpoint": "/internal/recommendations/precompute"
             | "/internal/recommendations/rationale-pregen",
    "method": "POST",
    "batch_size": 50   // optional, for precompute_scores only
  }

CMD override: lambdas.automation.recommendation_refresh.handler
"""

import json
import logging
import time

from lambdas.automation.base_automation import call_internal_endpoint, emit_metric

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    """
    Trigger recommendation pre-computation or LLM rationale pre-generation.

    Args:
        event: EventBridge scheduler event.
        context: Lambda context object (unused).

    Returns:
        A standard Lambda HTTP response dict.
    """
    task: str = event.get("task", "precompute_scores")
    endpoint: str = event.get("endpoint", "/internal/recommendations/precompute")
    method: str = event.get("method", "POST")
    batch_size: int = int(event.get("batch_size", 50))

    body = {"batch_size": batch_size} if task == "precompute_scores" else {}

    logger.info("Starting recommendation task: task=%s endpoint=%s", task, endpoint)
    start = time.time()

    try:
        result = call_internal_endpoint(endpoint, method=method, body=body)
        profiles_processed: int = result.get("profiles_processed", 0)
        duration_ms: float = (time.time() - start) * 1000

        metric_name = "ProfilesScored" if task == "precompute_scores" else "RationalesGenerated"
        emit_metric(metric_name, profiles_processed)

        logger.info(
            "Recommendation task complete: task=%s profiles=%d duration_ms=%.0f",
            task,
            profiles_processed,
            duration_ms,
        )
        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "task": task,
                    "profiles_processed": profiles_processed,
                    "duration_ms": duration_ms,
                }
            ),
        }

    except Exception as exc:
        logger.error(
            "Recommendation task failed: task=%s error=%s", task, exc, exc_info=True
        )
        return {
            "statusCode": 500,
            "body": json.dumps({"task": task, "error": str(exc)}),
        }
