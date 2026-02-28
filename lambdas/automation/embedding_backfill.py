"""
Lambda handler — Profile embedding backfill.

Finds user profiles that lack vector embeddings and generates Titan
embeddings via the NestJS internal endpoint (which calls AWS Bedrock).

Invoked by EventBridge Scheduler:
  - rate(6 hours): Runs 4× daily to catch newly created profiles.

Event payload:
  {
    "task": "backfill_embeddings",
    "endpoint": "/internal/embeddings/backfill",
    "method": "POST",
    "limit": 100
  }

CMD override: lambdas.automation.embedding_backfill.handler
"""

import json
import logging
import time

from lambdas.automation.base_automation import call_internal_endpoint, emit_metric

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    """
    Trigger profile embedding backfill via the NestJS internal endpoint.

    Args:
        event: EventBridge scheduler event.
        context: Lambda context object (unused).

    Returns:
        A standard Lambda HTTP response dict.
    """
    endpoint: str = event.get("endpoint", "/internal/embeddings/backfill")
    method: str = event.get("method", "POST")
    limit: int = int(event.get("limit", 100))

    logger.info("Starting embedding backfill: limit=%d", limit)
    start = time.time()

    try:
        result = call_internal_endpoint(endpoint, method=method, body={"limit": limit})
        embeddings_generated: int = result.get("embeddings_generated", 0)
        errors: int = result.get("errors", 0)
        duration_ms: float = (time.time() - start) * 1000

        emit_metric("EmbeddingsGenerated", embeddings_generated)
        if errors:
            emit_metric("EmbeddingErrors", errors)

        logger.info(
            "Embedding backfill complete: generated=%d errors=%d duration_ms=%.0f",
            embeddings_generated,
            errors,
            duration_ms,
        )
        return {
            "statusCode": 200,
            "body": json.dumps(
                {
                    "embeddings_generated": embeddings_generated,
                    "errors": errors,
                    "duration_ms": duration_ms,
                }
            ),
        }

    except Exception as exc:
        logger.error("Embedding backfill failed: error=%s", exc, exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(exc)}),
        }
