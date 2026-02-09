from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.recommendation import RecommendRequest, RecommendResponse

router = APIRouter(tags=["recommend"])


@router.post("/recommend", response_model=RecommendResponse)
def recommend_roles(payload: RecommendRequest, db: Session = Depends(get_db)):
    from app.models.user_profile import UserProfile
    from app.services.recommender import get_recommendations

    profile = db.get(UserProfile, payload.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    recommendations = get_recommendations(profile, db)
    return RecommendResponse(profile_id=profile.id, recommendations=recommendations)
