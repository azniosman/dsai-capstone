from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.profile import ProfileCreate, ProfileResponse

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
        skills=skills,
        resume_text=payload.resume_text,
        is_career_switcher=payload.is_career_switcher,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile
