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
    return RoadmapResponse(profile_id=profile_id, roadmap=roadmap)
