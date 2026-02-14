"""AI-powered resume bullet point rewriter."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.auth import get_current_user
from app.database import get_db
from app.models.user import User

router = APIRouter(tags=["resume-rewriter"])

class RewriteRequest(BaseModel):
    bullet_point: str
    target_role: str

class RewriteResponse(BaseModel):
    original: str
    rewritten: str
    improvement_notes: str

@router.post("/resume/rewrite", response_model=RewriteResponse)
def rewrite_bullet_point(payload: RewriteRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not settings.gemini_api_key:
        # Fallback for demo without API key
        return RewriteResponse(
            original=payload.bullet_point,
            rewritten=f"Optimized: {payload.bullet_point} (demonstrating impact and metrics)",
            improvement_notes="Add specific metrics (e.g., 'improved by 20%') to make this stronger. (Gemini API key missing)"
        )

    import google.generativeai as genai
    genai.configure(api_key=settings.gemini_api_key)

    prompt = (
        f"You are an expert tech resume writer. Rewrite the following resume bullet point for a {payload.target_role} role. "
        "Use active verbs, include potential metrics (placeholders if needed), and focus on impact. "
        "Also provide a brief note on why the change improves it.\n\n"
        f"Original: {payload.bullet_point}\n\n"
        "Output format:\n"
        "Rewritten: <optimized bullet point>\n"
        "Notes: <brief explanation>"
    )

    try:
        model = genai.GenerativeModel(settings.gemini_model)
        response = model.generate_content(prompt)
        content = response.text
        
        # Simple parsing logic (robustness improvements could be added)
        lines = content.split('\n')
        rewritten = next((line.replace("Rewritten:", "").strip() for line in lines if line.startswith("Rewritten:")), "Could not generate rewrite.")
        notes = next((line.replace("Notes:", "").strip() for line in lines if line.startswith("Notes:")), "Focus on quantifiable impact.")

        return RewriteResponse(
            original=payload.bullet_point,
            rewritten=rewritten,
            improvement_notes=notes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
