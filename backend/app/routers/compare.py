"""Multi-role comparison endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_tenant
from app.database import get_db
from app.models.job_role import JobRole
from app.models.user_profile import UserProfile
from app.models.tenant import Tenant
from app.services.skill_matcher import match_skills, compute_content_similarity

router = APIRouter(tags=["compare"])


class RoleComparisonItem(BaseModel):
    role_id: int
    title: str
    category: str
    salary_range: str | None
    match_score: float
    required_skills: list[str]
    preferred_skills: list[str]
    matched_skills: list[str]
    missing_skills: list[str]
    education_level: str
    min_experience_years: int
    career_switcher_friendly: bool
    transition_difficulty: str  # "easy", "moderate", "hard"


class CompareRequest(BaseModel):
    profile_id: int
    role_ids: list[int]


class CompareResponse(BaseModel):
    roles: list[RoleComparisonItem]
    common_skills: list[str]
    unique_skills_per_role: dict[str, list[str]]


@router.post("/compare-roles", response_model=CompareResponse)
def compare_roles(payload: CompareRequest, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant)):
    if len(payload.role_ids) < 2 or len(payload.role_ids) > 4:
        raise HTTPException(status_code=400, detail="Select 2-4 roles to compare")

    profile = db.query(UserProfile).filter(UserProfile.id == payload.profile_id, UserProfile.tenant_id == tenant.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    user_skills = profile.skills or []
    roles_data = []
    all_role_skills = {}

    for role_id in payload.role_ids:
        role = db.query(JobRole).filter(JobRole.id == role_id, JobRole.tenant_id == tenant.id).first()
        if not role:
            raise HTTPException(status_code=404, detail=f"Role {role_id} not found")

        combined = role.required_skills + role.preferred_skills
        scores = match_skills(user_skills, role.required_skills)
        content_sim = compute_content_similarity(user_skills, combined)
        matched = [s for s, v in scores.items() if v >= 0.5]
        missing = [s for s, v in scores.items() if v < 0.5]

        # Transition difficulty
        pct = len(matched) / max(len(role.required_skills), 1)
        if pct >= 0.7:
            difficulty = "easy"
        elif pct >= 0.4:
            difficulty = "moderate"
        else:
            difficulty = "hard"

        roles_data.append(RoleComparisonItem(
            role_id=role.id,
            title=role.title,
            category=role.category,
            salary_range=role.salary_range,
            match_score=round(content_sim, 3),
            required_skills=role.required_skills,
            preferred_skills=role.preferred_skills,
            matched_skills=matched,
            missing_skills=missing,
            education_level=role.education_level or "bachelor",
            min_experience_years=role.min_experience_years,
            career_switcher_friendly=role.career_switcher_friendly,
            transition_difficulty=difficulty,
        ))
        all_role_skills[role.title] = set(role.required_skills)

    # Common skills across all roles
    if all_role_skills:
        common = set.intersection(*all_role_skills.values())
    else:
        common = set()

    # Unique skills per role
    unique = {}
    for title, skills in all_role_skills.items():
        others = set()
        for t, s in all_role_skills.items():
            if t != title:
                others |= s
        unique[title] = list(skills - others)

    return CompareResponse(
        roles=roles_data,
        common_skills=list(common),
        unique_skills_per_role=unique,
    )


@router.get("/roles")
def list_roles(db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant)):
    """List all available roles for comparison picker."""
    roles = db.query(JobRole).filter(JobRole.tenant_id == tenant.id).all()
    return [{"id": r.id, "title": r.title, "category": r.category} for r in roles]
