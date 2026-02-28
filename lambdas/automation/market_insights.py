"""
Lambda handler — Market insights pre-aggregation.

Calls the NestJS internal endpoint to pre-compute and cache market
insight metrics from PostgreSQL. Replaces per-request DB aggregation
in DomainService.getMarketInsights().

Invoked by EventBridge Scheduler:
  - cron(0 4 * * ? *): Daily at 04:00 UTC (12:00 SGT noon).

Event payload:
  {
    "task": "aggregate_market_insights",
    "endpoint": "/internal/analytics/aggregate",
    "method": "POST"
  }

CMD override: lambdas.automation.market_insights.handler
"""

import json
import logging
import time

from lambdas.automation.base_automation import call_internal_endpoint, emit_metric

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    """
    Trigger market insights aggregation via the NestJS internal endpoint.

    Args:
        event: EventBridge scheduler event.
        context: Lambda context object (unused).

    Returns:
        A standard Lambda HTTP response dict.
    """
    endpoint: str = event.get("endpoint", "/internal/analytics/aggregate")
    method: str = event.get("method", "POST")

    logger.info("Starting market insights aggregation: endpoint=%s", endpoint)
    start = time.time()

    try:
        result = call_internal_endpoint(endpoint, method=method)
        tenants_processed: int = result.get("tenants_processed", 0)
        duration_ms: float = (time.time() - start) * 1000

        emit_metric("TenantsAggregated", tenants_processed)

        logger.info(
            "Market insights aggregation complete: tenants=%d duration_ms=%.0f",
            tenants_processed,
            duration_ms,
        )
        return {
            "statusCode": 200,
            "body": json.dumps(
                {"tenants_processed": tenants_processed, "duration_ms": duration_ms}
            ),
        }

    except Exception as exc:
        logger.error("Market insights aggregation failed: error=%s", exc, exc_info=True)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(exc)}),
        }
