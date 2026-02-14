from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.api_key import APIKey
from app.models.user import User, Role
from app.auth import has_role
from app.api_key_auth import create_api_key, revoke_api_key
from app.limiter import limiter


router = APIRouter(prefix="/api-keys", tags=["api-keys"])


class APIKeyCreate(BaseModel):
    name: str
    expires_at: datetime | None = None


class APIKeyResponse(BaseModel):
    id: int
    key: str
    name: str
    created_at: datetime
    expires_at: datetime | None
    is_active: bool
    model_config = {"from_attributes": True}


@router.post("/", response_model=APIKeyResponse)
@limiter.limit("10/minute")
def generate_new_api_key(
    request: Request,
    payload: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role([Role.ADMIN])),
):
    new_key = create_api_key(payload.name, current_user.tenant_id, db, payload.expires_at)
    return new_key

@router.get("/", response_model=list[APIKeyResponse])
@limiter.limit("10/minute")
def get_all_api_keys(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role([Role.ADMIN])),
):
    keys = db.query(APIKey).filter(APIKey.tenant_id == current_user.tenant_id).all()
    return keys

@router.delete("/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_key(
    api_key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role([Role.ADMIN])),
):
    revoke_api_key(api_key_id, current_user.tenant_id, db)
    return {"message": "API Key revoked successfully"}
