"""Lambda handler — direct invocation wrapper for store_embedding().

Accepts: {text, text_type, profile_id?, user_id?, metadata?}
Returns: {statusCode, body: {embedding_id}}

CMD override: lambdas.embedding_generator.handler
"""

import json
import logging

from lambdas.base import bootstrap_env

bootstrap_env()

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    try:
        text = event.get("text", "")
        text_type = event.get("text_type", "query")
        profile_id = event.get("profile_id")
        user_id = event.get("user_id")
        metadata = event.get("metadata", {})

        if not text:
            return {"statusCode": 400, "body": json.dumps({"error": "text is required"})}

        from app.database import SessionLocal
        from app.services.rag_service import store_embedding
        db = SessionLocal()
        try:
            emb = store_embedding(
                db,
                text_content=text,
                text_type=text_type,
                profile_id=profile_id,
                user_id=user_id,
                metadata=metadata,
            )
            return {"statusCode": 200, "body": json.dumps({"embedding_id": emb.id})}
        finally:
            db.close()

    except Exception as e:
        logger.error("Embedding generator error: %s", e, exc_info=True)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
