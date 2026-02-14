"""Singapore labor market insights endpoint."""

from app.models.tenant import Tenant
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api_key_auth import get_current_tenant_for_read
from app.database import get_db
from app.models.market_insight import MarketInsight

router = APIRouter(tags=["market"])


class MarketInsightResponse(BaseModel):
    role_category: str
    trending_skills: list[str]
    avg_salary_sgd: float
    demand_level: str
    hiring_volume: int
    yoy_growth_pct: float
    model_config = {"from_attributes": True}


class MarketOverview(BaseModel):
    insights: list[MarketInsightResponse]
    top_skills_overall: list[str]
    highest_demand_sectors: list[str]


# Seed data for market insights (used if DB is empty)
DEFAULT_INSIGHTS = [
    {
        "role_category": "Data & Analytics",
        "trending_skills": ["Python", "SQL", "Spark", "dbt", "Snowflake", "Power BI"],
        "avg_salary_sgd": 7500,
        "demand_level": "high",
        "hiring_volume": 2400,
        "yoy_growth_pct": 18.5,
    },
    {
        "role_category": "Software Engineering",
        "trending_skills": ["TypeScript", "React", "Node.js", "Docker", "Kubernetes", "Go"],
        "avg_salary_sgd": 8000,
        "demand_level": "high",
        "hiring_volume": 3200,
        "yoy_growth_pct": 12.3,
    },
    {
        "role_category": "Cloud & DevOps",
        "trending_skills": ["AWS", "Terraform", "Kubernetes", "CI/CD", "Docker", "Azure"],
        "avg_salary_sgd": 8500,
        "demand_level": "high",
        "hiring_volume": 1800,
        "yoy_growth_pct": 22.1,
    },
    {
        "role_category": "Cybersecurity",
        "trending_skills": ["Network Security", "SIEM", "Penetration Testing", "IAM", "Compliance"],
        "avg_salary_sgd": 9000,
        "demand_level": "high",
        "hiring_volume": 1200,
        "yoy_growth_pct": 25.8,
    },
    {
        "role_category": "AI/ML",
        "trending_skills": ["Python", "PyTorch", "NLP", "MLOps", "Computer Vision", "TensorFlow"],
        "avg_salary_sgd": 9500,
        "demand_level": "high",
        "hiring_volume": 1500,
        "yoy_growth_pct": 30.2,
    },
    {
        "role_category": "Product/Management",
        "trending_skills": ["Agile", "Scrum", "Data Science", "Communication", "Leadership"],
        "avg_salary_sgd": 10000,
        "demand_level": "medium",
        "hiring_volume": 900,
        "yoy_growth_pct": 8.7,
    },
]


@router.get("/market-insights", response_model=MarketOverview)
def get_market_insights(db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant_for_read)):
    insights = db.query(MarketInsight).filter(
        (MarketInsight.tenant_id == tenant.id) | (MarketInsight.tenant_id == None)
    ).all()

    if not insights:
        # Use default data
        insight_list = [MarketInsightResponse(**d) for d in DEFAULT_INSIGHTS]
    else:
        insight_list = [MarketInsightResponse.model_validate(i) for i in insights]

    # Aggregate top skills
    all_skills = {}
    for ins in (insights or DEFAULT_INSIGHTS):
        skills = ins.trending_skills if hasattr(ins, 'trending_skills') else ins["trending_skills"]
        for s in skills:
            all_skills[s] = all_skills.get(s, 0) + 1
    top_skills = sorted(all_skills, key=all_skills.get, reverse=True)[:10]

    # Highest demand sectors
    sorted_sectors = sorted(
        insight_list,
        key=lambda x: x.yoy_growth_pct,
        reverse=True,
    )
    highest_demand = [s.role_category for s in sorted_sectors[:3]]

    return MarketOverview(
        insights=insight_list,
        top_skills_overall=top_skills,
        highest_demand_sectors=highest_demand,
    )
