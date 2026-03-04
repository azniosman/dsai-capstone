"""Lambda handler — S3-triggered resume upload stub.

⚠️  PHASE 2 STUB — NOT DEPLOYED / NOT FUNCTIONAL ⚠️

This handler is triggered by S3 PutObject events on the uploads/ prefix.
It requires `app.services.rag_service.store_embedding()` which does not
yet exist.  Invoking it will always return HTTP 501.

Planned implementation (Phase 2):
  - Download file from S3 (PDF / DOCX / TXT)
  - Extract text using pdf-parse / python-docx
  - Chunk text at 512 tokens with 64-token overlap
  - Generate embeddings per chunk via EmbeddingService
  - Store chunks + embeddings in document_chunk table (pgvector)
  - Return {chunks_stored, embedding_ids[]}

Active resume upload path (Phase 1):
  POST /api/upload-resume  →  NestJS UploadController
    → ResumeParser.extractText() (pdf-parse / mammoth)
    → LlmService.parseResume() (structured JSON via Groq/Claude/Gemini)
    → Returns {name, email, phone, skills, experience_years}

CMD override (when implemented): lambdas.resume_upload_handler.handler
"""

import json
import logging

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    records = event.get("Records", [])
    key = records[0]["s3"]["object"]["key"] if records else "unknown"
    logger.warning(
        "resume_upload_handler triggered for s3_key=%s but embedding pipeline is not yet implemented (Phase 2 stub)",
        key,
    )
    return {
        "statusCode": 501,
        "body": json.dumps({
            "error": "S3 resume embedding pipeline not yet implemented",
            "phase": 2,
            "s3_key": key,
            "message": (
                "Use POST /api/upload-resume for synchronous resume parsing in the interim."
            ),
        }),
    }
