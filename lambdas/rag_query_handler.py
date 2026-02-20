"""Lambda handler — direct invocation wrapper for rag_query().

Accepts: {query, profile_id?, user_id?}
Returns: {statusCode, body: {answer, sources, engine}}

CMD override: lambdas.rag_query_handler.handler
"""

import json
import logging

from lambdas.base import bootstrap_env

bootstrap_env()

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    try:
        query = event.get("query", "")
        profile_id = event.get("profile_id")
        user_id = event.get("user_id")

        if not query:
            return {"statusCode": 400, "body": json.dumps({"error": "query is required"})}

        from app.database import SessionLocal
        from app.services.rag_service import rag_query
        db = SessionLocal()
        try:
            result = rag_query(db, query=query, profile_id=profile_id, user_id=user_id)
            return {"statusCode": 200, "body": json.dumps(result)}
        finally:
            db.close()

    except Exception as e:
        logger.error("RAG query handler error: %s", e, exc_info=True)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
