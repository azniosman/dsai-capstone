"""Data ingestion endpoints — called by n8n automation pipelines.

All endpoints are secured via X-API-Key authentication and accept
bulk JSON payloads for upsert into the database.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api_key_auth import get_current_tenant_by_api_key
from app.database import get_db
from app.models.sync_status import SyncStatus
from app.models.tenant import Tenant
from app.services.ingestion_service import (
    upsert_courses,
    upsert_job_roles,
    upsert_market_insights,
    upsert_skills,
)

router = APIRouter(prefix="/ingest", tags=["ingestion"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class SkillItem(BaseModel):
    name: str
    category: str = "General"


class SkillsPayload(BaseModel):
    skills: list[SkillItem]


class CourseItem(BaseModel):
    title: str
    provider: str = "Unknown"
    skills_taught: list[str] = []
    duration_weeks: int | None = None
    level: str = "intermediate"
    url: str | None = None
    certification: str | None = None
    course_fee: float = 0
    subsidy_percent: float = 70
    mces_eligible: bool = False
    skillsfuture_eligible: bool = True
    skillsfuture_credit_amount: float = 500.0
    nett_fee_after_subsidy: float = 500.0


class CoursesPayload(BaseModel):
    courses: list[CourseItem]


class JobRoleItem(BaseModel):
    title: str
    category: str = "General"
    description: str = ""
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    min_experience_years: int = 0
    education_level: str = "bachelor"
    career_switcher_friendly: bool = False
    salary_range: str | None = None


class JobRolesPayload(BaseModel):
    roles: list[JobRoleItem]


class MarketInsightItem(BaseModel):
    role_category: str
    trending_skills: list[str] = []
    avg_salary_sgd: float | None = None
    demand_level: str | None = None
    hiring_volume: int | None = None
    yoy_growth_pct: float | None = None
    forecast_2026: str | None = None
    outlook: str | None = None


class MarketInsightsPayload(BaseModel):
    insights: list[MarketInsightItem]


class UpsertResult(BaseModel):
    created: int
    updated: int
    skipped: int


class SyncStatusItem(BaseModel):
    source: str
    last_synced_at: str | None
    records_synced: int
    status: str
    details: str | None = None

    model_config = {"from_attributes": True}


class SyncStatusResponse(BaseModel):
    syncs: list[SyncStatusItem]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/skills", response_model=UpsertResult)
def ingest_skills(
    payload: SkillsPayload,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant_by_api_key),
):
    """Bulk upsert skills from SSG Skills Framework."""
    items = [s.model_dump() for s in payload.skills]
    return upsert_skills(db, items, tenant.id)


@router.post("/courses", response_model=UpsertResult)
def ingest_courses(
    payload: CoursesPayload,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant_by_api_key),
):
    """Bulk upsert SCTP courses from SSG course catalog."""
    items = [c.model_dump() for c in payload.courses]
    return upsert_courses(db, items, tenant.id)


@router.post("/job-roles", response_model=UpsertResult)
def ingest_job_roles(
    payload: JobRolesPayload,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant_by_api_key),
):
    """Bulk upsert job roles from job board APIs."""
    items = [r.model_dump() for r in payload.roles]
    return upsert_job_roles(db, items, tenant.id)


@router.post("/market-insights", response_model=UpsertResult)
def ingest_market_insights(
    payload: MarketInsightsPayload,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant_by_api_key),
):
    """Bulk upsert market insights from job board salary/demand data."""
    items = [i.model_dump() for i in payload.insights]
    return upsert_market_insights(db, items, tenant.id)


@router.get("/status", response_model=SyncStatusResponse)
def get_sync_status(
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant_by_api_key),
):
    """Return the last sync status for all data sources."""
    records = db.query(SyncStatus).all()
    return SyncStatusResponse(
        syncs=[
            SyncStatusItem(
                source=r.source,
                last_synced_at=r.last_synced_at.isoformat() if r.last_synced_at else None,
                records_synced=r.records_synced or 0,
                status=r.status or "unknown",
                details=r.details,
            )
            for r in records
        ]
    )
