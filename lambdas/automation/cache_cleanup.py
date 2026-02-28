"""
Lambda handler — Bulk delete expired ``ssg_cache`` rows.

Invoked by EventBridge Scheduler:
  - cron(0 3 * * ? *): Daily at 03:00 UTC (11:00 SGT) — low traffic window.

Event payload:
  {
    "task": "cleanup_ssg_cache",
    "endpoint": "/internal/cache/cleanup",
    "method": "POST"
  }

Response:
  { "statusCode": 200, "body": { "deleted": N, "duration_ms": N } }

CMD override: lambdas.automation.cache_cleanup.handler
"""

import json
import logging
import time

from lambdas.automation.base_automation import call_internal_endpoint, emit_metric

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    """
    Trigger an expired cache row purge by calling the NestJS internal endpoint.

    Args:
        event: EventBridge scheduler event.
        context: Lambda context object (unused).

    Returns:
        A standard Lambda HTTP response dict with the number of deleted rows.
    """
    endpoint: str = event.get("endpoint", "/internal/cache/cleanup")
    method: str = event.get("method", "POST")

    logger.info("Starting cache cleanup: endpoint=%s", endpoint)
    start = time.time()

    try:
        result = call_internal_endpoint(endpoint, method=method)
        deleted: int = result.get("deleted", 0)
        duration_ms: float = (time.time() - start) * 1000

        emit_metric("CacheRowsDeleted", deleted)

        logger.info(
            "Cache cleanup complete: deleted=%d duration_ms=%.0f",
            deleted,
            duration_ms,
        )
        return {
            "statusCode": 200,
            "body": json.dumps({"deleted": deleted, "duration_ms": duration_ms}),
        }

    except Exception as exc:
        logger.error("Cache cleanup failed: error=%s", exc, exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(exc)}),
        }
