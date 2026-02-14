"""Hybrid job recommender combining content-based and rule-based scoring."""

import hashlib
import time

from sqlalchemy.orm import Session

from app.models.job_role import JobRole
from app.models.user_profile import UserProfile
from app.schemas.recommendation import RoleRecommendation
from app.services.skill_matcher import compute_content_similarity, match_skills

# Hybrid weights
W_CONTENT = 0.55
W_RULE = 0.25
W_CAREER_SWITCHER = 0.20

EDUCATION_RANK = {
    "diploma": 1,
    "bachelor": 2,
    "master": 3,
    "phd": 4,
}

# In-memory TTL cache for recommendation results
_rec_cache: dict[str, tuple[float, list["RoleRecommendation"]]] = {}
_CACHE_TTL = 300  # seconds


def _cache_key(profile: UserProfile, top_n: int, tenant_id: int) -> str:
    skills_str = ",".join(sorted(profile.skills or []))
    raw = f"{profile.id}:{skills_str}:{profile.years_experience}:{profile.education}:{profile.is_career_switcher}:{top_n}:{tenant_id}"
    return hashlib.md5(raw.encode()).hexdigest()


def _rule_score(profile: UserProfile, role: JobRole) -> float:
    """Rule-based matching on education and experience."""
    score = 0.0

    # Education match
    user_ed = EDUCATION_RANK.get((profile.education or "").lower(), 0)
    role_ed = EDUCATION_RANK.get((role.education_level or "").lower(), 0)
    if user_ed >= role_ed:
        score += 0.5
    elif user_ed == role_ed - 1:
        score += 0.25

    # Experience match
    if profile.years_experience >= role.min_experience_years:
        score += 0.5
    elif profile.years_experience >= role.min_experience_years - 1:
        score += 0.25

    return score


def _career_switcher_bonus(profile: UserProfile, role: JobRole) -> float:
    """Gradient career-switcher bonus that tapers with experience."""
    if profile.is_career_switcher and role.career_switcher_friendly:
        return max(0.0, 1.0 - profile.years_experience * 0.1)
    return 0.0


def _skill_match_quality(content_score: float) -> str:
    """Classify skill match quality based on content similarity score."""
    if content_score >= 0.7:
        return "strong"
    if content_score >= 0.4:
        return "moderate"
    return "developing"


def get_recommendations(
    profile: UserProfile, db: Session, tenant_id: int, top_n: int = 5
) -> list[RoleRecommendation]:
    # Check cache (clean expired entries first)
    key = _cache_key(profile, top_n, tenant_id)
    now = time.time()
    expired_keys = [k for k, (t, _) in _rec_cache.items() if now - t >= _CACHE_TTL]
    for k in expired_keys:
        del _rec_cache[k]
    if key in _rec_cache:
        cached_time, cached_result = _rec_cache[key]
        if now - cached_time < _CACHE_TTL:
            return cached_result

    roles = db.query(JobRole).filter(JobRole.tenant_id == tenant_id).all()
    
    # Pre-build skill index for the user (optimization)
    from app.services.skill_matcher import build_skill_index
    user_skills = profile.skills or []
    
    # Only build index if user has skills
    cached_index = build_skill_index(user_skills) if user_skills else None

    scored = []
    for role in roles:
            
        all_role_skills = role.required_skills + role.preferred_skills

        content_score = compute_content_similarity(user_skills, all_role_skills, cached_index=cached_index)
        rule_score = _rule_score(profile, role)
        cs_bonus = _career_switcher_bonus(profile, role)

        match_score = (
            W_CONTENT * content_score
            + W_RULE * rule_score
            + W_CAREER_SWITCHER * cs_bonus
        )

        # Determine matched/missing skills
        skill_scores = match_skills(user_skills, role.required_skills, cached_index=cached_index)
        matched = [s for s, v in skill_scores.items() if v >= 0.5]
        missing = [s for s, v in skill_scores.items() if v < 0.5]

        # Build rationale
        parts = []
        if matched:
            parts.append(f"Strong in: {', '.join(matched[:3])}")
        if missing:
            parts.append(f"Gaps in: {', '.join(missing[:3])}")
        if cs_bonus > 0:
            parts.append("Career-switcher friendly role")
        rationale = ". ".join(parts) if parts else "General match"

        scored.append(RoleRecommendation(
            role_id=role.id,
            title=role.title,
            category=role.category,
            match_score=round(match_score, 3),
            content_score=round(content_score, 3),
            rule_score=round(rule_score, 3),
            career_switcher_bonus=round(cs_bonus, 3),
            matched_skills=matched,
            missing_skills=missing,
            rationale=rationale,
            salary_range=role.salary_range,
            skill_match_quality=_skill_match_quality(content_score),
        ))

    scored.sort(key=lambda r: r.match_score, reverse=True)
    result = scored[:top_n]

    # Store in cache
    _rec_cache[key] = (time.time(), result)

    return result
