import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth, profile, recommend, skill_gap, upskilling,
    upload, jd_match, progress, chat, interview,
    market, compare, peer, projects, export,
)

app = FastAPI(
    title="Job Recommendation & Skill Gap Analysis",
    version="0.2.0",
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
