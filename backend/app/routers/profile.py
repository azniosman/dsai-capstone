from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_current_user_optional
from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter(tags=["profile"])


@router.get("/profile/me", response_model=ProfileResponse)
def get_my_profile(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    from app.models.user_profile import UserProfile

    profile = db.query(UserProfile).filter(UserProfile.user_id == user.id, UserProfile.tenant_id == user.tenant_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No profile linked to this account")
    return profile


@router.post("/profile", response_model=ProfileResponse)
def create_profile(
    payload: ProfileCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    from app.services.resume_parser import extract_skills
    from app.models.user_profile import UserProfile

    skills = payload.skills or []
    if payload.resume_text:
        skills = list(set(skills + extract_skills(payload.resume_text)))

    tenant_id = 1  # default to global tenant
    if user:
        tenant_id = user.tenant_id

    # If authenticated user already has a profile, update it instead of creating a duplicate
    if user:
        existing = db.query(UserProfile).filter(UserProfile.user_id == user.id, UserProfile.tenant_id == tenant_id).first()
        if existing:
            existing.name = payload.name
            existing.education = payload.education
            existing.years_experience = payload.years_experience
            existing.age = payload.age
            existing.skills = skills
            existing.resume_text = payload.resume_text
            existing.is_career_switcher = payload.is_career_switcher
            db.commit()
            db.refresh(existing)
            return existing

    profile = UserProfile(
        name=payload.name,
        education=payload.education,
        years_experience=payload.years_experience,
        age=payload.age,
        skills=skills,
        resume_text=payload.resume_text,
        is_career_switcher=payload.is_career_switcher,
        user_id=user.id if user else None,
        tenant_id=tenant_id,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/profile/{profile_id}", response_model=ProfileResponse)
def get_profile(profile_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    from app.models.user_profile import UserProfile

    profile = db.query(UserProfile).filter(
        UserProfile.id == profile_id,
        UserProfile.tenant_id == user.tenant_id,
        UserProfile.user_id == user.id,
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("/profile/{profile_id}", response_model=ProfileResponse)
def update_profile(
    profile_id: int,
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user_optional),
):
    from app.models.user_profile import UserProfile

    # If authenticated, filter by tenant; otherwise allow update by profile ID only
    if user:
        profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == user.tenant_id).first()
    else:
        profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.user_id == None).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.user_id and (not user or user.id != profile.user_id):
        raise HTTPException(status_code=403, detail="Not authorized to edit this profile")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
