"""Dashboard summary endpoint — aggregates key profile metrics in a single call."""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])


class DashboardSummary(BaseModel):
    profile_id: int
    name: str
    education: str | None
    years_experience: int
    skills: list[str]
    is_career_switcher: bool
    skills_count: int
    recommendations_count: int
    gaps_identified: int
    progress_entries: int
    career_readiness: float  # 0-100 percentage


@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.user_profile import UserProfile
    from app.models.job_role import JobRole

    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == user.id, UserProfile.tenant_id == user.tenant_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="No profile linked to this account")

    user_skills = set(s.lower() for s in (profile.skills or []))

    # Lightweight skill matching — simple set intersection, no embeddings
    roles = db.query(JobRole).filter(JobRole.tenant_id == user.tenant_id).all()
    recs_count = 0
    total_gaps = 0
    best_match = 0.0

    for role in roles:
        req_skills = set(s.lower() for s in (role.required_skills or []))
        if not req_skills:
            continue
        matched = user_skills & req_skills
        match_ratio = len(matched) / len(req_skills)
        missing = len(req_skills) - len(matched)
        if match_ratio > 0.3:
            recs_count += 1
        total_gaps += missing
        if match_ratio > best_match:
            best_match = match_ratio

    # Count progress entries
    from app.models.skill_progress import SkillProgress
    progress_count = (
        db.query(SkillProgress)
        .filter(SkillProgress.profile_id == profile.id)
        .count()
    )

    # Career readiness = best match score as percentage
    career_readiness = round(best_match * 100, 1)

    return DashboardSummary(
        profile_id=profile.id,
        name=profile.name,
        education=profile.education,
        years_experience=profile.years_experience,
        skills=profile.skills or [],
        is_career_switcher=profile.is_career_switcher,
        skills_count=len(profile.skills or []),
        recommendations_count=recs_count,
        gaps_identified=total_gaps,
        progress_entries=progress_count,
        career_readiness=career_readiness,
    )
