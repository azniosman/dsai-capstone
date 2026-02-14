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
        # Analyze gaps for the top recommended role
        top_role_id = recommendations[0].role_id
        # We need to fetch the role object or use the service efficiently
        # gap_analyzer.analyze_gaps analyzes *all* relevant roles or specific ones?
        # Let's check gap_analyzer signature. It usually returns a list of gaps for reviewed roles.
        # For dashboard summary, we might just want a simple count or use the pre-computed 'missing_skills' from recommendations.
        
        # Optimization: use the 'missing_skills' already returned by get_recommendations for the top 3
        # This avoids re-running the gap analyzer service which might be heavy.
        
        # Sum gaps from top 3 recommendations to give a sense of "work to do"
        # Or just show gaps for the #1 role. Let's do #1 role.
        total_gaps = len(recommendations[0].missing_skills)

    # Count progress entries
    from app.models.skill_progress import SkillProgress
    progress_count = (
        db.query(SkillProgress)
        .filter(SkillProgress.profile_id == profile.id)
        .count()
    )

    return DashboardSummary(
        profile_id=profile.id,
        name=profile.name,
        education=profile.education,
        years_experience=profile.years_experience,
        skills=profile.skills or [],
        is_career_switcher=profile.is_career_switcher,
        skills_count=len(profile.skills or []),
        recommendations_count=len(recommendations),
        gaps_identified=total_gaps,
        progress_entries=progress_count,
        # Ensure readiness is nicely bounded
        career_readiness=min(100.0, max(0.0, career_readiness)),
    )
