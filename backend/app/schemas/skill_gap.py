from pydantic import BaseModel


class SkillGapItem(BaseModel):
    skill: str
    required_level: str  # "required" or "preferred"
    user_level: float  # 0.0, 0.5, 1.0
    user_level_label: str  # "missing", "partial", "strong"
    gap_severity: str  # "high", "medium", "low", "none"
    priority: int  # 1-5 (1 = highest)


class RoleGap(BaseModel):
    role_id: int
    role_title: str
    match_score: float
    gaps: list[SkillGapItem]


class SkillGapResponse(BaseModel):
    profile_id: int
    gaps: list[RoleGap]


class RoadmapItem(BaseModel):
    skill: str
    course_title: str
    provider: str
    duration_weeks: int
    level: str
    url: str | None
    certification: str | None
    priority: int
    week_start: int
    week_end: int
    # SkillsFuture Credit fields
    skillsfuture_eligible: bool = True
    skillsfuture_credit_amount: float = 0.0
    course_fee: float = 0.0
    nett_fee_after_subsidy: float = 0.0


class RoadmapResponse(BaseModel):
    profile_id: int
    roadmap: list[RoadmapItem]
    total_weeks: int = 0
    total_cost: float = 0.0
    total_after_subsidy: float = 0.0
    total_skillsfuture_applicable: float = 0.0
