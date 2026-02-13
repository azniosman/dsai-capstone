import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.auth import create_access_token, create_refresh_token, hash_password
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.tenant import Tenant

router = APIRouter(prefix="/sso", tags=["sso"])


def _require_development():
    """Block mock SSO endpoints in production."""
    if settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mock SSO is disabled in production",
        )


@router.get("/login")
async def sso_login_redirect(request: Request):
    _require_development()
    # In a real implementation, this would redirect to an Identity Provider (IdP)
    # such as Okta, Auth0, Google, etc.
    return RedirectResponse(url="/sso/callback?code=mock_sso_code&state=mock_state")


@router.get("/callback")
async def sso_callback(code: str, state: str, db: Session = Depends(get_db)):
    _require_development()

    if code != "mock_sso_code" or state != "mock_state":
        raise HTTPException(status_code=400, detail="Invalid SSO callback parameters")

    # Simulate finding/creating user in the 'Global' tenant
    email = "sso_user@global.com"
    tenant_name = "Global"

    tenant = db.query(Tenant).filter_by(name=tenant_name).first()
    if not tenant:
        raise HTTPException(status_code=500, detail="Global tenant not found")

    user = db.query(User).filter_by(email=email, tenant_id=tenant.id).first()
    if not user:
        user = User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            name="SSO User",
            tenant_id=tenant.id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token({"sub": str(user.id)}, tenant_id=user.tenant_id)
    refresh_token = create_refresh_token(user.id)

    # In a real app, this would redirect to the frontend with tokens
    return {
        "message": "SSO Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }
