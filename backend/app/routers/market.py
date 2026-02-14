"""Singapore labor market insights endpoint."""

from app.models.tenant import Tenant
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_tenant
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
    forecast_2026: str | None = None
    outlook: str | None = None
    model_config = {"from_attributes": True}


class MarketOverview(BaseModel):
    insights: list[MarketInsightResponse]
    top_skills_overall: list[str]
    highest_demand_sectors: list[str]


from app.services.market_simulator import DEFAULT_INSIGHTS


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


@router.post("/simulate")
def trigger_market_simulation(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant)
):
    from app.services.market_simulator import simulate_market_changes
    return simulate_market_changes(db, tenant.id)
