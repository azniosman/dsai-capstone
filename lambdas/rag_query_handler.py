"""Lambda handler — RAG query stub.

⚠️  PHASE 2 STUB — NOT DEPLOYED / NOT FUNCTIONAL ⚠️

This handler requires `app.services.rag_service.rag_query()` which does not
yet exist.  Invoking it will always return HTTP 501.

Planned implementation (Phase 2):
  - Generate embedding for `query` via EmbeddingService
  - Perform pgvector cosine similarity search against document_chunk table
  - Inject top-K chunks into LLM system prompt
  - Return structured {answer, sources, engine} response

CMD override (when implemented): lambdas.rag_query_handler.handler
"""

import json
import logging

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    logger.warning(
        "rag_query_handler invoked but RAG pipeline is not yet implemented (Phase 2 stub)"
    )
    return {
        "statusCode": 501,
        "body": json.dumps({
            "error": "RAG query pipeline not yet implemented",
            "phase": 2,
            "message": (
                "The embedding and vector retrieval layer is scheduled for Phase 2. "
                "Use POST /api/chat for LLM-based career coaching in the interim."
            ),
        }),
    }
