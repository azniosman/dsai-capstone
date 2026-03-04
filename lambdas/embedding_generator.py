"""Lambda handler — embedding generation stub.

⚠️  PHASE 2 STUB — NOT DEPLOYED / NOT FUNCTIONAL ⚠️

This handler requires `app.services.rag_service.store_embedding()` which does
not yet exist.  Invoking it will always return HTTP 501.

Planned implementation (Phase 2):
  - Accept {text, text_type, profile_id?, user_id?, metadata?}
  - Generate 384-dim embedding via all-MiniLM-L6-v2 (EmbeddingService)
  - Upsert into ProfileEmbedding / DocumentChunk entity (pgvector column)
  - Return {embedding_id}

CMD override (when implemented): lambdas.embedding_generator.handler
"""

import json
import logging

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    logger.warning(
        "embedding_generator invoked but embedding pipeline is not yet implemented (Phase 2 stub)"
    )
    return {
        "statusCode": 501,
        "body": json.dumps({
            "error": "Embedding generation not yet implemented",
            "phase": 2,
            "message": (
                "The pgvector embedding pipeline is scheduled for Phase 2. "
                "Profile creation via POST /api/profile stores skills as text arrays in the interim."
            ),
        }),
    }
