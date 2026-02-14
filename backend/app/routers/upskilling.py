from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_tenant, get_current_user
from app.database import get_db
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.skill_gap import RoadmapResponse

router = APIRouter(tags=["upskilling"])


@router.get("/upskilling/{profile_id}", response_model=RoadmapResponse)
def get_upskilling_roadmap(profile_id: int, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant), user: User = Depends(get_current_user)):
    from app.models.user_profile import UserProfile
    from app.services.roadmap_generator import generate_roadmap

    profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant.id, UserProfile.user_id == user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    roadmap = generate_roadmap(profile, db, tenant_id=tenant.id)

    total_weeks = roadmap[-1].week_end if roadmap else 0
    total_cost = sum(r.course_fee for r in roadmap)
    total_after_subsidy = sum(r.nett_fee_after_subsidy for r in roadmap)
    total_sf = sum(r.skillsfuture_credit_amount for r in roadmap if r.skillsfuture_eligible)

    return RoadmapResponse(
        profile_id=profile_id,
        roadmap=roadmap,
        total_weeks=total_weeks,
        total_cost=round(total_cost, 2),
        total_after_subsidy=round(total_after_subsidy, 2),
        total_skillsfuture_applicable=round(total_sf, 2),
    )
