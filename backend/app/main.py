import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from sqlalchemy import inspect as sa_inspect, text

from app.config import settings
from app.database import engine, SessionLocal, Base
from app.limiter import limiter
from app.models import JobRole, Skill, SCTPCourse, MarketInsight, Tenant
from app.routers import (
    auth, profile, recommend, skill_gap, upskilling,
    upload, jd_match, progress, chat, interview,
    market, compare, peer, projects, export, courses, sso, api_keys, audit_logs,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "seed_data")


def _load_seed_json(filename):
    path = os.path.join(SEED_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def _sync_schema():
    """Add any columns defined in models but missing from the DB.

    SQLAlchemy's create_all() only creates new tables — it does NOT alter
    existing ones.  This helper inspects every mapped table and issues
    ALTER TABLE … ADD COLUMN for anything the DB is missing.

    New NOT NULL columns are added as nullable first, backfilled with a
    sensible default, then altered to NOT NULL — so existing rows survive.
    """
    inspector = sa_inspect(engine)

    # Known safe defaults for backfilling existing rows
    _BACKFILL_DEFAULTS = {
        "tenant_id": "1",       # Global tenant
        "is_active": "true",
        "failed_login_attempts": "0",
        "role": "'member'::role",
    }

    with engine.begin() as conn:
        for table in Base.metadata.sorted_tables:
            if not inspector.has_table(table.name):
                continue  # create_all will handle new tables
            db_columns = {c["name"] for c in inspector.get_columns(table.name)}
            for col in table.columns:
                if col.name not in db_columns:
                    col_type = col.type.compile(dialect=engine.dialect)

                    # Always add as nullable first to avoid breaking existing rows
                    stmt = f'ALTER TABLE {table.name} ADD COLUMN {col.name} {col_type}'
                    logger.info("Schema sync: %s", stmt)
                    conn.execute(text(stmt))

                    # Backfill existing rows if we know a safe default
                    if col.name in _BACKFILL_DEFAULTS:
                        backfill = f"UPDATE {table.name} SET {col.name} = {_BACKFILL_DEFAULTS[col.name]} WHERE {col.name} IS NULL"
                        logger.info("Schema sync backfill: %s", backfill)
                        conn.execute(text(backfill))

                    # Apply NOT NULL constraint after backfill
                    if not col.nullable and col.name in _BACKFILL_DEFAULTS:
                        alter = f"ALTER TABLE {table.name} ALTER COLUMN {col.name} SET NOT NULL"
                        logger.info("Schema sync constraint: %s", alter)
                        try:
                            conn.execute(text(alter))
                        except Exception as e:
                            logger.warning("Could not set NOT NULL on %s.%s: %s", table.name, col.name, e)


def _seed_database():
    """Create tables and seed reference data if empty."""
    Base.metadata.create_all(bind=engine)

    # Ensure the Global tenant exists BEFORE _sync_schema runs,
    # because _sync_schema backfills tenant_id=1 on existing rows.
    db = SessionLocal()
    try:
        global_tenant = db.query(Tenant).filter(Tenant.name == 'Global').first()
        if not global_tenant:
            global_tenant = Tenant(name='Global')
            db.add(global_tenant)
            db.commit()
            db.refresh(global_tenant)
            logger.info("Created 'Global' tenant (id=%s).", global_tenant.id)
    finally:
        db.close()

    _sync_schema()

    db = SessionLocal()
    try:
        global_tenant = db.query(Tenant).filter(Tenant.name == 'Global').first()
        
        # Check if any skills are present for the global tenant to determine if seeding is needed
        if db.query(Skill).filter(Skill.tenant_id == global_tenant.id).first():
            logger.info("Database already seeded for 'Global' tenant, skipping.")
            return

        logger.info("Seeding database with reference data for 'Global' tenant...")

        # Skills
        data = _load_seed_json("skills_taxonomy.json")
        if data:
            for cat in data["categories"]:
                for name in cat["skills"]:
                    db.add(Skill(name=name, category=cat["name"], tenant_id=global_tenant.id))
            db.commit()

        # Job roles
        data = _load_seed_json("job_roles.json")
        if data:
            for r in data["roles"]:
                db.add(JobRole(
                    title=r["title"], category=r["category"],
                    description=r["description"],
                    required_skills=r["required_skills"],
                    preferred_skills=r["preferred_skills"],
                    min_experience_years=r["min_experience_years"],
                    education_level=r["education_level"],
                    career_switcher_friendly=r["career_switcher_friendly"],
                    salary_range=r.get("salary_range"),
                    tenant_id=global_tenant.id
                ))
            db.commit()

        # SCTP courses
        data = _load_seed_json("sctp_courses.json")
        if data:
            for c in data["courses"]:
                db.add(SCTPCourse(
                    title=c["title"], provider=c["provider"],
                    skills_taught=c["skills_taught"],
                    duration_weeks=c["duration_weeks"], level=c["level"],
                    url=c.get("url"), certification=c.get("certification"),
                    skillsfuture_eligible=c.get("skillsfuture_eligible", True),
                    skillsfuture_credit_amount=c.get("skillsfuture_credit_amount", 500.0),
                    course_fee=c.get("course_fee", 2000.0),
                    nett_fee_after_subsidy=c.get("nett_fee_after_subsidy", 500.0),
                    subsidy_percent=c.get("subsidy_percent", 70),
                    mces_eligible=c.get("mces_eligible", False),
                    tenant_id=global_tenant.id
                ))
            db.commit()

        # Market insights
        from app.routers.market import DEFAULT_INSIGHTS
        if not db.query(MarketInsight).filter(MarketInsight.tenant_id == global_tenant.id).first():
            for ins in DEFAULT_INSIGHTS:
                db.add(MarketInsight(**ins, tenant_id=global_tenant.id))
            db.commit()

        logger.info("Database seeding complete")

    finally:
        db.close()


@asynccontextmanager
async def lifespan(app):
    _seed_database()
    # Pre-load ML model to avoid cold-start timeouts
    try:
        logger.info("Pre-loading ML model...")
        from app.ml.embeddings import warmup_model
        warmup_model()
        logger.info("ML model loaded successfully")
    except Exception as e:
        logger.warning("ML model warmup failed (will retry on first request): %s", e)
    # Pre-build taxonomy FAISS index so first request is fast
    try:
        logger.info("Pre-building taxonomy FAISS index...")
        from app.ml.taxonomy import get_taxonomy_index
        get_taxonomy_index()
        logger.info("Taxonomy index built successfully")
    except Exception as e:
        logger.warning("Taxonomy index warmup failed (will retry on first request): %s", e)
    logger.info("Application startup complete")
    yield


app = FastAPI(
    title="Job Recommendation & Skill Gap Analysis",
    version="0.2.0",
    lifespan=lifespan,
)

# --- Rate limiter ---
app.state.limiter = limiter


def _rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests. Please try again later."},
    )


app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# --- Security headers middleware ---
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


app.add_middleware(SecurityHeadersMiddleware)


# --- CORS ---
_default_origins = ["http://localhost:3000", "http://localhost:5173"]
_env_origins = os.getenv("CORS_ORIGINS", "")
cors_origins = (
    [o.strip() for o in _env_origins.split(",") if o.strip()]
    if _env_origins
    else _default_origins
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core
app.include_router(auth.router, prefix="/api")
app.include_router(profile.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")
app.include_router(skill_gap.router, prefix="/api")
app.include_router(upskilling.router, prefix="/api")

# New features
app.include_router(upload.router, prefix="/api")
app.include_router(jd_match.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(market.router, prefix="/api")
app.include_router(compare.router, prefix="/api")
app.include_router(peer.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(sso.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(audit_logs.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
