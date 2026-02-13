"""Skill gap analysis — compares user skills against recommended roles."""

from sqlalchemy.orm import Session

from app.models.user_profile import UserProfile
from app.schemas.skill_gap import RoleGap, SkillGapItem
from app.services.recommender import get_recommendations
from app.services.skill_matcher import match_skills


def _severity(score: float, required_level: str) -> str:
    if score >= 1.0:
        return "none"
    if score >= 0.5:
        return "low" if required_level == "preferred" else "medium"
    return "high" if required_level == "required" else "medium"


def _level_label(score: float) -> str:
    if score >= 1.0:
        return "strong"
    if score >= 0.5:
        return "partial"
    return "missing"


def _priority(severity: str, required_level: str) -> int:
    base = {"high": 1, "medium": 2, "low": 3, "none": 5}
    p = base.get(severity, 3)
    if required_level == "preferred":
        p = min(p + 1, 5)
    return p


def analyze_gaps(profile: UserProfile, db: Session, tenant_id: int) -> list[RoleGap]:
    recommendations = get_recommendations(profile, db, tenant_id=tenant_id, top_n=3)
    user_skills = profile.skills or []

    results = []
    for rec in recommendations:
        from app.models.job_role import JobRole
        role = db.query(JobRole).filter(JobRole.id == rec.role_id, JobRole.tenant_id == tenant_id).first()
        if not role:
            continue

        gaps = []
        # Score required skills
        req_scores = match_skills(user_skills, role.required_skills)
        for skill, score in req_scores.items():
            sev = _severity(score, "required")
            gaps.append(SkillGapItem(
                skill=skill,
                required_level="required",
                user_level=score,
                user_level_label=_level_label(score),
                gap_severity=sev,
                priority=_priority(sev, "required"),
            ))

        # Score preferred skills
        pref_scores = match_skills(user_skills, role.preferred_skills)
        for skill, score in pref_scores.items():
            sev = _severity(score, "preferred")
            gaps.append(SkillGapItem(
                skill=skill,
                required_level="preferred",
                user_level=score,
                user_level_label=_level_label(score),
                gap_severity=sev,
                priority=_priority(sev, "preferred"),
            ))

        gaps.sort(key=lambda g: g.priority)
        results.append(RoleGap(
            role_id=rec.role_id,
            role_title=rec.title,
            match_score=rec.match_score,
            gaps=gaps,
        ))

    return results
