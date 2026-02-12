from pydantic import BaseModel


class RoleRecommendation(BaseModel):
    role_id: int
    title: str
    category: str
    match_score: float
    content_score: float
    rule_score: float
    career_switcher_bonus: float
    matched_skills: list[str]
    missing_skills: list[str]
    rationale: str
    salary_range: str | None
    skill_match_quality: str = "developing"  # "strong", "moderate", "developing"


class RecommendRequest(BaseModel):
    profile_id: int


class RecommendResponse(BaseModel):
    profile_id: int
    recommendations: list[RoleRecommendation]
