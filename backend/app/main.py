from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import profile, recommend, skill_gap, upskilling

app = FastAPI(
    title="Job Recommendation & Skill Gap Analysis",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")
app.include_router(skill_gap.router, prefix="/api")
app.include_router(upskilling.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}
