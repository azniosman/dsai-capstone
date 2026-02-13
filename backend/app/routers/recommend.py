from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api_key_auth import get_api_key, get_current_tenant_by_api_key
from app.database import get_db
from app.models.tenant import Tenant
from app.schemas.recommendation import RecommendRequest, RecommendResponse

router = APIRouter(tags=["recommend"])


@router.post("/recommend", response_model=RecommendResponse)
def recommend_roles(payload: RecommendRequest, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant_by_api_key)):
    from app.models.user_profile import UserProfile
    from app.services.recommender import get_recommendations

    profile = db.query(UserProfile).filter(UserProfile.id == payload.profile_id, UserProfile.tenant_id == tenant.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    recommendations = get_recommendations(profile, db, tenant_id=tenant.id)
    return RecommendResponse(profile_id=profile.id, recommendations=recommendations)
