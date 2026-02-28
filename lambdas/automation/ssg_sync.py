"""
Lambda handler — SSG course and job role cache sync.

Invoked by EventBridge Scheduler on two separate schedules:
  - cron(0 1 * * ? *):  task=sync_courses  (01:00 UTC / 09:00 SGT daily)
  - cron(30 1 * * ? *): task=sync_jobroles (01:30 UTC / 09:30 SGT daily)

Event payload:
  {
    "task": "sync_courses" | "sync_jobroles",
    "endpoint": "/internal/sync/ssg/courses" | "/internal/sync/ssg/jobroles",
    "method": "POST"
  }

Response:
  { "statusCode": 200, "body": { "task": "...", "synced": N } }

CMD override: lambdas.automation.ssg_sync.handler
"""

import json
import logging
import time

from lambdas.automation.base_automation import call_internal_endpoint, emit_metric

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    """
    Trigger SSG course or job role sync by calling the NestJS internal endpoint.

    Args:
        event: EventBridge scheduler event. Must contain ``task`` and ``endpoint``.
        context: Lambda context object (unused).

    Returns:
        A standard Lambda HTTP response dict.
    """
    task: str = event.get("task", "sync_courses")
    endpoint: str = event.get("endpoint", "/internal/sync/ssg/courses")
    method: str = event.get("method", "POST")

    logger.info("Starting SSG sync task: task=%s endpoint=%s", task, endpoint)
    start = time.time()

    try:
        result = call_internal_endpoint(endpoint, method=method)
        synced: int = result.get("synced", 0)
        errors: int = result.get("errors", 0)
        duration_ms: float = (time.time() - start) * 1000

        metric_name = "SsgCoursesSynced" if task == "sync_courses" else "SsgJobRolesSynced"
        emit_metric(metric_name, synced)
        if errors:
            emit_metric("SsgSyncErrors", errors)

        logger.info(
            "SSG sync complete: task=%s synced=%d errors=%d duration_ms=%.0f",
            task,
            synced,
            errors,
            duration_ms,
        )
        return {
            "statusCode": 200,
            "body": json.dumps(
                {"task": task, "synced": synced, "errors": errors, "duration_ms": duration_ms}
            ),
        }

    except Exception as exc:
        logger.error("SSG sync failed: task=%s error=%s", task, exc, exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"task": task, "error": str(exc)}),
        }
