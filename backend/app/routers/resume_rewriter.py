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

    import json

    prompt = (
        f"You are an expert tech resume writer. Rewrite the following resume bullet point for a {payload.target_role} role. "
        "Use active verbs, include potential metrics (placeholders if needed), and focus on impact. "
        "Also provide a brief note on why the change improves it.\n\n"
        f"Original: {payload.bullet_point}\n\n"
        "Output ONLY valid JSON in the following format: "
        '{"rewritten": "<optimized bullet point>", "notes": "<brief explanation>"}'
    )

    try:
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            generation_config={"response_mime_type": "application/json"}
        )
        response = model.generate_content(prompt)
        
        # Clean up potential markdown formatting
        text_response = response.text.strip()
        if text_response.startswith("```"):
            text_response = text_response.strip("`").replace("json", "", 1).strip()
            
        parsed = json.loads(text_response)
        rewritten = parsed.get("rewritten", "Could not generate rewrite.")
        notes = parsed.get("notes", "Focus on quantifiable impact.")

        return RewriteResponse(
            original=payload.bullet_point,
            rewritten=rewritten,
            improvement_notes=notes
        )
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "ResourceExhausted" in error_str or "quota" in error_str.lower():
            return RewriteResponse(
                original=payload.bullet_point,
                rewritten=f"Rate limited: {payload.bullet_point}",
                improvement_notes="The AI service is temporarily rate-limited. Please try again in a minute."
            )
        return RewriteResponse(
            original=payload.bullet_point,
            rewritten=f"Optimized: {payload.bullet_point} (demonstrating impact and metrics)",
            improvement_notes=f"AI rewrite unavailable. Try adding specific metrics (e.g., 'improved by 20%')."
        )
