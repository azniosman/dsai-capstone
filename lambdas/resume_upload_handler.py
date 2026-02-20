"""Lambda handler — triggered by S3 PutObject events on the uploads/ prefix.

Downloads the file, extracts text, and stores a Titan embedding in pgvector.
CMD override: lambdas.resume_upload_handler.handler
"""

import json
import logging
import urllib.parse

from lambdas.base import bootstrap_env

bootstrap_env()

logger = logging.getLogger(__name__)


def handler(event: dict, context) -> dict:
    try:
        record = event["Records"][0]["s3"]
        bucket = record["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["object"]["key"])
        logger.info("Processing resume upload: s3://%s/%s", bucket, key)

        import boto3
        s3 = boto3.client("s3")
        obj = s3.get_object(Bucket=bucket, Key=key)
        content = obj["Body"].read()

        # Extract text based on file extension
        ext = key.rsplit(".", 1)[-1].lower() if "." in key else "txt"
        if ext == "pdf":
            import io
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif ext in ("docx", "doc"):
            import io
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs)
        else:
            text = content.decode("utf-8", errors="ignore")

        if not text.strip():
            logger.warning("No text extracted from %s", key)
            return {"statusCode": 200, "body": json.dumps({"status": "empty_text"})}

        # Extract profile_id from S3 metadata if present
        meta = obj.get("Metadata", {})
        profile_id = int(meta["profile_id"]) if "profile_id" in meta else None
        user_id = int(meta["user_id"]) if "user_id" in meta else None

        # Store embedding
        from app.database import SessionLocal
        from app.services.rag_service import store_embedding
        db = SessionLocal()
        try:
            emb = store_embedding(
                db,
                text_content=text,
                text_type="resume",
                profile_id=profile_id,
                user_id=user_id,
                metadata={"s3_key": key, "bucket": bucket},
            )
            logger.info("Stored embedding id=%d for %s", emb.id, key)
            return {"statusCode": 200, "body": json.dumps({"embedding_id": emb.id})}
        finally:
            db.close()

    except Exception as e:
        logger.error("Resume upload handler error: %s", e, exc_info=True)
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
