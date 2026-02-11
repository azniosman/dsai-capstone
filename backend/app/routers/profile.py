from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter(tags=["profile"])


@router.post("/profile", response_model=ProfileResponse)
def create_profile(payload: ProfileCreate, db: Session = Depends(get_db)):
    from app.services.resume_parser import extract_skills
    from app.models.user_profile import UserProfile

    skills = payload.skills or []
    if payload.resume_text:
        skills = list(set(skills + extract_skills(payload.resume_text)))

    profile = UserProfile(
        name=payload.name,
        education=payload.education,
        years_experience=payload.years_experience,
        age=payload.age,
        skills=skills,
        resume_text=payload.resume_text,
        is_career_switcher=payload.is_career_switcher,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/profile/{profile_id}", response_model=ProfileResponse)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    from app.models.user_profile import UserProfile

    profile = db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("/profile/{profile_id}", response_model=ProfileResponse)
def update_profile(profile_id: int, payload: ProfileUpdate, db: Session = Depends(get_db)):
    from app.models.user_profile import UserProfile

    profile = db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
