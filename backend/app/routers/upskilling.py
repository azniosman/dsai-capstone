from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.skill_gap import RoadmapResponse

router = APIRouter(tags=["upskilling"])


@router.get("/upskilling/{profile_id}", response_model=RoadmapResponse)
def get_upskilling_roadmap(profile_id: int, db: Session = Depends(get_db)):
    from app.models.user_profile import UserProfile
    from app.services.roadmap_generator import generate_roadmap

    profile = db.get(UserProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    roadmap = generate_roadmap(profile, db)

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
