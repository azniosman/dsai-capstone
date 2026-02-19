"""Dashboard summary endpoint — aggregates key profile metrics in a single call."""

import logging
from typing import List, Optional
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
    education: Optional[str]
    years_experience: int
    skills: list[str]
    is_career_switcher: bool
    skills_count: int
    recommendations_count: int
    gaps_identified: int
    progress_entries: int
    skills_delta: int
    recommendations_delta: int
    gaps_delta: int
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

    # Use the optimized recommender service
    from app.services.recommender import get_recommendations
    recommendations = get_recommendations(profile, db, user.tenant_id, top_n=3)
    
    # Calculate best match score (career readiness)
    best_match = recommendations[0].match_score if recommendations else 0.0
    career_readiness = round(best_match * 100, 1)

    # Use gap analyzer for accurate gap counts on the top role
    total_gaps = 0
    if recommendations:
        from app.services.gap_analyzer import analyze_gaps
        # Optimization: use the 'missing_skills' already returned by get_recommendations for the top 3
        # This avoids re-running the gap analyzer service which might be heavy.
        
        # for dashboard summary, we show gaps for the #1 role.
        total_gaps = len(recommendations[0].missing_skills)

    # Count progress entries
    from app.models.skill_progress import SkillProgress
    progress_count = (
        db.query(SkillProgress)
        .filter(SkillProgress.profile_id == profile.id)
        .count()
    )

    # Calculate current metrics package
    current_metrics = {
        "skills_count": len(user_skills),
        "recommendations_count": len(recommendations),
        "gaps_count": total_gaps,
        "career_readiness": career_readiness,
    }

    # Capture snapshot and calculate deltas
    from app.services.dashboard_service import capture_daily_snapshot, get_dashboard_deltas
    
    # Lazy capture: we capture the snapshot when the user visits the dashboard
    capture_daily_snapshot(profile, db, current_metrics)
    deltas = get_dashboard_deltas(profile, db, current_metrics)

    return DashboardSummary(
        profile_id=profile.id,
        name=profile.name,
        education=profile.education,
        years_experience=profile.years_experience,
        skills=profile.skills or [],
        is_career_switcher=profile.is_career_switcher,
        skills_count=current_metrics["skills_count"],
        recommendations_count=current_metrics["recommendations_count"],
        gaps_identified=current_metrics["gaps_count"],
        progress_entries=progress_count,
        # Ensure readiness is nicely bounded
        career_readiness=min(100.0, max(0.0, career_readiness)),
        skills_delta=deltas["skills_delta"],
        recommendations_delta=deltas["recommendations_delta"],
        gaps_delta=deltas["gaps_delta"],
    )
