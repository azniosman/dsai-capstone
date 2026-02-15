"""Data ingestion service — upsert logic for bulk data imports via n8n pipelines."""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.job_role import JobRole
from app.models.market_insight import MarketInsight
from app.models.sctp_course import SCTPCourse
from app.models.skill import Skill
from app.models.sync_status import SyncStatus

logger = logging.getLogger(__name__)


def _update_sync_status(
    db: Session, source: str, count: int, status: str, details: str | None = None
) -> None:
    """Create or update a sync-status record for the given source."""
    record = db.query(SyncStatus).filter(SyncStatus.source == source).first()
    if record:
        record.last_synced_at = datetime.now(timezone.utc)
        record.records_synced = count
        record.status = status
        record.details = details
    else:
        db.add(
            SyncStatus(
                source=source,
                last_synced_at=datetime.now(timezone.utc),
                records_synced=count,
                status=status,
                details=details,
            )
        )
    db.commit()


# ---------------------------------------------------------------------------
# Skills
# ---------------------------------------------------------------------------

def upsert_skills(
    db: Session, items: list[dict], tenant_id: int
) -> dict:
    """Upsert skills by name (natural key).

    Each item: {"name": str, "category": str}
    """
    created = updated = skipped = 0
    for item in items:
        name = item.get("name", "").strip()
        if not name:
            skipped += 1
            continue

        existing = (
            db.query(Skill)
            .filter(Skill.name == name, Skill.tenant_id == tenant_id)
            .first()
        )
        if existing:
            # Update category if changed
            cat = item.get("category", "").strip()
            if cat and existing.category != cat:
                existing.category = cat
                updated += 1
            else:
                skipped += 1
        else:
            db.add(
                Skill(
                    name=name,
                    category=item.get("category", "General"),
                    tenant_id=tenant_id,
                )
            )
            created += 1

    db.commit()
    total = created + updated
    _update_sync_status(db, "ssg_skills", total, "success")
    logger.info("Skills upsert: created=%d updated=%d skipped=%d", created, updated, skipped)
    return {"created": created, "updated": updated, "skipped": skipped}


# ---------------------------------------------------------------------------
# Courses
# ---------------------------------------------------------------------------

def upsert_courses(
    db: Session, items: list[dict], tenant_id: int
) -> dict:
    """Upsert SCTP courses by title (natural key).

    Each item mirrors the seed JSON schema.
    """
    created = updated = skipped = 0
    for item in items:
        title = item.get("title", "").strip()
        if not title:
            skipped += 1
            continue

        existing = (
            db.query(SCTPCourse)
            .filter(SCTPCourse.title == title, (SCTPCourse.tenant_id == tenant_id) | (SCTPCourse.tenant_id == None))
            .first()
        )
        if existing:
            # Update mutable fields
            for field in (
                "provider", "skills_taught", "duration_weeks", "level",
                "url", "certification", "course_fee", "subsidy_percent",
                "mces_eligible", "skillsfuture_eligible",
                "skillsfuture_credit_amount", "nett_fee_after_subsidy",
            ):
                val = item.get(field)
                if val is not None and getattr(existing, field, None) != val:
                    setattr(existing, field, val)
            updated += 1
        else:
            db.add(
                SCTPCourse(
                    title=title,
                    provider=item.get("provider", "Unknown"),
                    skills_taught=item.get("skills_taught", []),
                    duration_weeks=item.get("duration_weeks"),
                    level=item.get("level", "intermediate"),
                    url=item.get("url"),
                    certification=item.get("certification"),
                    course_fee=item.get("course_fee", 0),
                    subsidy_percent=item.get("subsidy_percent", 70),
                    mces_eligible=item.get("mces_eligible", False),
                    skillsfuture_eligible=item.get("skillsfuture_eligible", True),
                    skillsfuture_credit_amount=item.get("skillsfuture_credit_amount", 500.0),
                    nett_fee_after_subsidy=item.get("nett_fee_after_subsidy", 500.0),
                    tenant_id=tenant_id,
                )
            )
            created += 1

    db.commit()
    total = created + updated
    _update_sync_status(db, "ssg_courses", total, "success")
    logger.info("Courses upsert: created=%d updated=%d skipped=%d", created, updated, skipped)
    return {"created": created, "updated": updated, "skipped": skipped}


# ---------------------------------------------------------------------------
# Job Roles
# ---------------------------------------------------------------------------

def upsert_job_roles(
    db: Session, items: list[dict], tenant_id: int
) -> dict:
    """Upsert job roles by title (natural key).

    Each item mirrors the seed JSON schema.
    """
    created = updated = skipped = 0
    for item in items:
        title = item.get("title", "").strip()
        if not title:
            skipped += 1
            continue

        existing = (
            db.query(JobRole)
            .filter(JobRole.title == title, JobRole.tenant_id == tenant_id)
            .first()
        )
        if existing:
            for field in (
                "category", "description", "required_skills",
                "preferred_skills", "min_experience_years",
                "education_level", "career_switcher_friendly", "salary_range",
            ):
                val = item.get(field)
                if val is not None and getattr(existing, field, None) != val:
                    setattr(existing, field, val)
            updated += 1
        else:
            db.add(
                JobRole(
                    title=title,
                    category=item.get("category", "General"),
                    description=item.get("description", ""),
                    required_skills=item.get("required_skills", []),
                    preferred_skills=item.get("preferred_skills", []),
                    min_experience_years=item.get("min_experience_years", 0),
                    education_level=item.get("education_level", "bachelor"),
                    career_switcher_friendly=item.get("career_switcher_friendly", False),
                    salary_range=item.get("salary_range"),
                    tenant_id=tenant_id,
                )
            )
            created += 1

    db.commit()
    total = created + updated
    _update_sync_status(db, "job_board", total, "success")
    logger.info("Job roles upsert: created=%d updated=%d skipped=%d", created, updated, skipped)
    return {"created": created, "updated": updated, "skipped": skipped}


# ---------------------------------------------------------------------------
# Market Insights
# ---------------------------------------------------------------------------

def upsert_market_insights(
    db: Session, items: list[dict], tenant_id: int | None = None
) -> dict:
    """Upsert market insights by role_category (natural key)."""
    created = updated = skipped = 0
    for item in items:
        category = item.get("role_category", "").strip()
        if not category:
            skipped += 1
            continue

        existing = (
            db.query(MarketInsight)
            .filter(
                MarketInsight.role_category == category,
                (MarketInsight.tenant_id == tenant_id) | (MarketInsight.tenant_id == None),
            )
            .first()
        )
        if existing:
            for field in (
                "trending_skills", "avg_salary_sgd", "demand_level",
                "hiring_volume", "yoy_growth_pct", "forecast_2026", "outlook",
            ):
                val = item.get(field)
                if val is not None:
                    setattr(existing, field, val)
            updated += 1
        else:
            db.add(
                MarketInsight(
                    role_category=category,
                    trending_skills=item.get("trending_skills", []),
                    avg_salary_sgd=item.get("avg_salary_sgd"),
                    demand_level=item.get("demand_level"),
                    hiring_volume=item.get("hiring_volume"),
                    yoy_growth_pct=item.get("yoy_growth_pct"),
                    forecast_2026=item.get("forecast_2026"),
                    outlook=item.get("outlook"),
                    tenant_id=tenant_id,
                )
            )
            created += 1

    db.commit()
    total = created + updated
    _update_sync_status(db, "market_insights", total, "success")
    logger.info("Market insights upsert: created=%d updated=%d skipped=%d", created, updated, skipped)
    return {"created": created, "updated": updated, "skipped": skipped}
