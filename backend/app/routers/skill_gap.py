from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api_key_auth import get_api_key, get_current_tenant_by_api_key
from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.skill_gap import SkillGapResponse

router = APIRouter(tags=["skill-gap"])


@router.get("/skill-gap/{profile_id}", response_model=SkillGapResponse)
def get_skill_gap(profile_id: int, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant_by_api_key)):
    from app.models.user_profile import UserProfile
    from app.services.gap_analyzer import analyze_gaps

    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    gaps = analyze_gaps(profile, db, tenant_id=tenant.id)
    return SkillGapResponse(profile_id=profile_id, gaps=gaps)
