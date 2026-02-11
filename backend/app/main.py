import json
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, SessionLocal, Base
from app.models import JobRole, Skill, SCTPCourse, MarketInsight
from app.routers import (
    auth, profile, recommend, skill_gap, upskilling,
    upload, jd_match, progress, chat, interview,
    market, compare, peer, projects, export,
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


def _seed_database():
    """Create tables and seed reference data if empty."""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(Skill).first():
            logger.info("Database already seeded, skipping")
            return  # already seeded

        logger.info("Seeding database with reference data...")

        # Skills
        data = _load_seed_json("skills_taxonomy.json")
        if data:
            for cat in data["categories"]:
                for name in cat["skills"]:
                    db.add(Skill(name=name, category=cat["name"]))
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
                ))
            db.commit()

        # Market insights
        from app.routers.market import DEFAULT_INSIGHTS
        if not db.query(MarketInsight).first():
            for ins in DEFAULT_INSIGHTS:
                db.add(MarketInsight(**ins))
            db.commit()

        logger.info("Database seeding complete")

    finally:
        db.close()


@asynccontextmanager
async def lifespan(app):
    _seed_database()
    # Pre-load ML model to avoid cold-start timeouts
    logger.info("Pre-loading ML model...")
    from app.ml.embeddings import warmup_model
    warmup_model()
    logger.info("Application startup complete")
    yield


app = FastAPI(
    title="Job Recommendation & Skill Gap Analysis",
    version="0.2.0",
    lifespan=lifespan,
)

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


@app.get("/health")
def health():
    return {"status": "ok"}
