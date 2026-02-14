"""Progress tracking — record and retrieve skill progress over time."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_tenant, get_current_user
from app.database import get_db
from app.models.skill_progress import SkillProgress
from app.models.user_profile import UserProfile
from app.models.tenant import Tenant
from app.models.user import User

router = APIRouter(tags=["progress"])


class ProgressEntry(BaseModel):
    skill: str
    level: float
    recorded_at: str | None = None
    model_config = {"from_attributes": True}


class ProgressUpdate(BaseModel):
    profile_id: int
    skill: str
    level: float = Field(ge=0.0, le=1.0)  # 0.0, 0.5, 1.0


class ProgressResponse(BaseModel):
    profile_id: int
    entries: list[ProgressEntry]
    skills_acquired: int
    skills_in_progress: int
    skills_total: int


class ProgressSnapshot(BaseModel):
    profile_id: int
    snapshot_date: str
    skills: dict[str, float]


@router.post("/progress", response_model=ProgressEntry)
def record_progress(payload: ProgressUpdate, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant), user: User = Depends(get_current_user)):
    profile = db.query(UserProfile).filter(UserProfile.id == payload.profile_id, UserProfile.tenant_id == tenant.id, UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    entry = SkillProgress(
        profile_id=payload.profile_id,
        skill=payload.skill,
        level=payload.level,
        tenant_id=tenant.id,
    )
    db.add(entry)

    # Also update profile skills if level >= 0.5
    current_skills = list(profile.skills or [])
    if payload.level >= 0.5 and payload.skill not in current_skills:
        current_skills.append(payload.skill)
        profile.skills = current_skills
    db.commit()
    db.refresh(entry)
    return ProgressEntry(
        skill=entry.skill,
        level=entry.level,
        recorded_at=str(entry.recorded_at),
    )


@router.get("/progress/{profile_id}", response_model=ProgressResponse)
def get_progress(profile_id: int, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant), user: User = Depends(get_current_user)):
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant.id, UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    entries = (
        db.query(SkillProgress)
        .filter_by(profile_id=profile_id, tenant_id=tenant.id)
        .order_by(SkillProgress.recorded_at.desc())
        .all()
    )

    # Dedupe to latest per skill
    latest: dict[str, SkillProgress] = {}
    for e in entries:
        if e.skill not in latest:
            latest[e.skill] = e

    acquired = sum(1 for e in latest.values() if e.level >= 1.0)
    in_progress = sum(1 for e in latest.values() if 0.0 < e.level < 1.0)

    return ProgressResponse(
        profile_id=profile_id,
        entries=[ProgressEntry(skill=e.skill, level=e.level, recorded_at=str(e.recorded_at)) for e in entries],
        skills_acquired=acquired,
        skills_in_progress=in_progress,
        skills_total=len(latest),
    )


@router.get("/progress/{profile_id}/timeline")
def get_progress_timeline(profile_id: int, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant), user: User = Depends(get_current_user)):
    """Get skill progress grouped by date for timeline visualization."""
    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant.id, UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    entries = (
        db.query(SkillProgress)
        .filter_by(profile_id=profile_id, tenant_id=tenant.id)
        .order_by(SkillProgress.recorded_at.asc())
        .all()
    )
    timeline = []
    for e in entries:
        timeline.append({
            "skill": e.skill,
            "level": e.level,
            "date": str(e.recorded_at.date()) if e.recorded_at else None,
        })
    return {"profile_id": profile_id, "timeline": timeline}
