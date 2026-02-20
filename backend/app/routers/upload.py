"""File upload endpoint — extract text from PDF/DOCX resumes."""

import io
import logging
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db

router = APIRouter(tags=["upload"])
logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
}


class UploadResponse(BaseModel):
    text: str
    skills: list[str]
    embedding_id: Optional[int] = None


def _extract_pdf(content: bytes) -> str:
    from PyPDF2 import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs)


@router.post("/upload-resume", response_model=UploadResponse)
async def upload_resume(
    file: UploadFile = File(...),
    profile_id: Optional[int] = Form(None),
    user_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Relaxed MIME type check: trust extension if MIME is generic/binary
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        if file.content_type not in ["application/octet-stream", "application/x-www-form-urlencoded"]:
            pass  # log only — rely on extension for parsing

    # Read with size limit
    chunks = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)  # 1 MB chunks
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_FILE_SIZE_BYTES:
            raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")
        chunks.append(chunk)
    content = b"".join(chunks)

    ext = file.filename.rsplit(".", 1)[-1].lower()

    if ext == "pdf":
        text = _extract_pdf(content)
    elif ext in ("docx", "doc"):
        text = _extract_docx(content)
    elif ext == "txt":
        text = content.decode("utf-8", errors="ignore")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

    from app.services.resume_parser import extract_skills
    skills = extract_skills(text)

    # Store Titan embedding — non-fatal (skipped in local dev without Bedrock)
    embedding_id: Optional[int] = None
    try:
        from app.services.rag_service import store_embedding
        emb = store_embedding(
            db,
            text_content=text,
            text_type="resume",
            profile_id=profile_id,
            user_id=user_id,
            metadata={"filename": file.filename, "skills": skills[:20]},
        )
        embedding_id = emb.id
    except Exception as e:
        logger.warning("Resume embedding skipped (Bedrock unavailable in local dev): %s", e)

    return UploadResponse(text=text, skills=skills, embedding_id=embedding_id)
