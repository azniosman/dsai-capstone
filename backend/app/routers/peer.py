"""Peer comparison — anonymized comparison with similar profiles."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_tenant
from app.database import get_db
from app.models.user_profile import UserProfile
from app.models.tenant import Tenant

router = APIRouter(tags=["peer"])


class PeerStats(BaseModel):
    role_title: str
    avg_skills_count: float
    avg_experience_years: float
    most_common_skills: list[str]
    most_common_education: str
    career_switcher_pct: float
    total_peers: int


class PeerComparisonResponse(BaseModel):
    profile_id: int
    your_skills_count: int
    your_experience: int
    peer_insights: list[PeerStats]


@router.get("/peer-comparison/{profile_id}", response_model=PeerComparisonResponse)
def peer_comparison(profile_id: int, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant)):
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Get recommended roles for this profile
    from app.services.recommender import get_recommendations
    recs = get_recommendations(profile, db, tenant_id=tenant.id)

    all_profiles = db.query(UserProfile).filter(UserProfile.tenant_id == tenant.id).all()
    user_skills = set(s.lower() for s in (profile.skills or []))

    insights = []
    for rec in recs:
        # Find profiles with overlapping skills to this role
        role_skills = set(s.lower() for s in (rec.matched_skills + rec.missing_skills))
        similar_profiles = []
        for p in all_profiles:
            if p.id == profile_id:
                continue
            p_skills = set(s.lower() for s in (p.skills or []))
            overlap = len(p_skills & role_skills)
            if overlap >= 2:
                similar_profiles.append(p)

        if not similar_profiles:
            # Generate synthetic peer data
            insights.append(PeerStats(
                role_title=rec.title,
                avg_skills_count=len(rec.matched_skills) + 2,
                avg_experience_years=3.5,
                most_common_skills=rec.matched_skills[:5] if rec.matched_skills else ["Python", "SQL"],
                most_common_education="bachelor",
                career_switcher_pct=0.4,
                total_peers=0,
            ))
            continue

        avg_skills = sum(len(p.skills or []) for p in similar_profiles) / len(similar_profiles)
        avg_exp = sum(p.years_experience for p in similar_profiles) / len(similar_profiles)

        # Most common skills
        skill_freq: dict[str, int] = {}
        for p in similar_profiles:
            for s in (p.skills or []):
                skill_freq[s] = skill_freq.get(s, 0) + 1
        top_skills = sorted(skill_freq, key=skill_freq.get, reverse=True)[:5]

        # Most common education
        ed_freq: dict[str, int] = {}
        for p in similar_profiles:
            ed = p.education or "bachelor"
            ed_freq[ed] = ed_freq.get(ed, 0) + 1
        top_ed = max(ed_freq, key=ed_freq.get)

        cs_pct = sum(1 for p in similar_profiles if p.is_career_switcher) / len(similar_profiles)

        insights.append(PeerStats(
            role_title=rec.title,
            avg_skills_count=round(avg_skills, 1),
            avg_experience_years=round(avg_exp, 1),
            most_common_skills=top_skills,
            most_common_education=top_ed,
            career_switcher_pct=round(cs_pct, 2),
            total_peers=len(similar_profiles),
        ))

    return PeerComparisonResponse(
        profile_id=profile_id,
        your_skills_count=len(profile.skills or []),
        your_experience=profile.years_experience,
        peer_insights=insights,
    )
