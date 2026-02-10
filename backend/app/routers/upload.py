"""File upload endpoint — extract text from PDF/DOCX resumes."""

import io

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

router = APIRouter(tags=["upload"])


class UploadResponse(BaseModel):
    text: str
    skills: list[str]


def _extract_pdf(content: bytes) -> str:
    from PyPDF2 import PdfReader
    reader = PdfReader(io.BytesIO(content))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(content: bytes) -> str:
    from docx import Document
    doc = Document(io.BytesIO(content))
    return "\n".join(p.text for p in doc.paragraphs)


@router.post("/upload-resume", response_model=UploadResponse)
async def upload_resume(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    content = await file.read()

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

    return UploadResponse(text=text, skills=skills)
