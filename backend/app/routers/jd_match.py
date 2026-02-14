"""JD paste & instant gap analysis — compare user skills against a job description."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_tenant, get_current_user
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.skill_gap import SkillGapItem

router = APIRouter(tags=["jd-match"])


class JDMatchRequest(BaseModel):
    profile_id: int
    job_description: str
    job_title: str | None = None


class JDMatchResponse(BaseModel):
    job_title: str
    extracted_skills: list[str]
    match_score: float
    gaps: list[SkillGapItem]
    matched_skills: list[str]
    missing_skills: list[str]


@router.post("/jd-match", response_model=JDMatchResponse)
def jd_match(payload: JDMatchRequest, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant), user: User = Depends(get_current_user)):
    from app.models.user_profile import UserProfile
    from app.services.resume_parser import extract_skills
    from app.services.skill_matcher import match_skills, compute_content_similarity

    profile = db.query(UserProfile).filter(UserProfile.id == payload.profile_id, UserProfile.tenant_id == tenant.id, UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Extract skills from JD text
    jd_skills = extract_skills(payload.job_description)
    if not jd_skills:
        raise HTTPException(status_code=400, detail="Could not extract skills from job description")

    user_skills = profile.skills or []

    # Score
    skill_scores = match_skills(user_skills, jd_skills)
    content_sim = compute_content_similarity(user_skills, jd_skills)
    matched = [s for s, v in skill_scores.items() if v >= 0.5]
    missing = [s for s, v in skill_scores.items() if v < 0.5]

    # Build gap items
    gaps = []
    for skill, score in skill_scores.items():
        if score >= 1.0:
            sev, label = "none", "strong"
        elif score >= 0.5:
            sev, label = "medium", "partial"
        else:
            sev, label = "high", "missing"
        priority = {"high": 1, "medium": 2, "none": 4}.get(sev, 3)
        gaps.append(SkillGapItem(
            skill=skill,
            required_level="required",
            user_level=score,
            user_level_label=label,
            gap_severity=sev,
            priority=priority,
        ))
    gaps.sort(key=lambda g: g.priority)

    return JDMatchResponse(
        job_title=payload.job_title or "Custom Job",
        extracted_skills=jd_skills,
        match_score=round(content_sim, 3),
        gaps=gaps,
        matched_skills=matched,
        missing_skills=missing,
    )
