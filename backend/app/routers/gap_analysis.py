"""Bedrock-powered structured gap analysis — POST /api/analyze-gap.

Returns structured JSON with overall_readiness, priority_gaps, narrative,
and timeline_weeks.  Persists an AnalysisResult row for history tracking.

This endpoint is separate from and does NOT replace GET /api/skill-gap/{id}
(rule-based gap analysis).  This one uses LLM-structured output via Bedrock.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

router = APIRouter(tags=["gap-analysis"])
logger = logging.getLogger(__name__)

_bedrock_client = None


def _get_bedrock_client():
    global _bedrock_client
    if _bedrock_client is None:
        import boto3
        _bedrock_client = boto3.client("bedrock-runtime", region_name=settings.aws_region)
    return _bedrock_client


class GapAnalysisRequest(BaseModel):
    profile_id: int
    target_role: Optional[str] = None


class GapAnalysisResponse(BaseModel):
    overall_readiness: float
    priority_gaps: list[str]
    narrative: str
    timeline_weeks: int
    analysis_id: Optional[int] = None


@router.post("/analyze-gap", response_model=GapAnalysisResponse)
def analyze_gap(req: GapAnalysisRequest, db: Session = Depends(get_db)):
    """Run Bedrock-structured gap analysis for a profile."""
    from app.models.user_profile import UserProfile
    from app.models.analysis_result import AnalysisResult

    profile = db.query(UserProfile).filter(UserProfile.id == req.profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    current_skills = profile.skills or []
    target_role = req.target_role or (
        profile.desired_roles[0] if profile.desired_roles else "Software Engineer"
    )

    system_prompt = (
        "You are a career intelligence system. Respond ONLY with valid JSON — no markdown, "
        "no explanation text, no code fences. The JSON must have exactly these keys: "
        "overall_readiness (float 0-1), priority_gaps (array of skill name strings, max 8), "
        "narrative (string, 2-3 sentences), timeline_weeks (integer)."
    )
    user_message = (
        f"Profile: current skills = {current_skills}. "
        f"Target role: {target_role}. "
        "Analyse the skill gap and return structured JSON."
    )

    try:
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 512,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        })
        client = _get_bedrock_client()
        response = client.invoke_model(
            modelId=settings.bedrock_model_id,
            body=body,
            contentType="application/json",
            accept="application/json",
        )
        raw = json.loads(response["body"].read())
        content_text = raw["content"][0]["text"]
        parsed = json.loads(content_text)
    except Exception as e:
        logger.error("Bedrock gap analysis failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")

    # Normalise / clamp values
    overall_readiness = max(0.0, min(1.0, float(parsed.get("overall_readiness", 0.5))))
    priority_gaps = parsed.get("priority_gaps", [])[:8]
    narrative = str(parsed.get("narrative", ""))
    timeline_weeks = int(parsed.get("timeline_weeks", 12))

    result_json = {
        "overall_readiness": overall_readiness,
        "priority_gaps": priority_gaps,
        "narrative": narrative,
        "timeline_weeks": timeline_weeks,
        "target_role": target_role,
    }

    # Persist for history
    analysis_id: Optional[int] = None
    try:
        record = AnalysisResult(
            profile_id=req.profile_id,
            analysis_type="gap_analysis",
            result_json=result_json,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        analysis_id = record.id
    except Exception as e:
        logger.warning("Failed to persist AnalysisResult: %s", e)

    return GapAnalysisResponse(
        overall_readiness=overall_readiness,
        priority_gaps=priority_gaps,
        narrative=narrative,
        timeline_weeks=timeline_weeks,
        analysis_id=analysis_id,
    )
