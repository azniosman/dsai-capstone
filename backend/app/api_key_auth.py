import secrets
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.api_key import APIKey
from app.models.tenant import Tenant
from app.models.user import User, Role
from app.auth import get_current_user, has_role


api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def get_api_key(
    api_key: str = Depends(api_key_header),
    db: Session = Depends(get_db),
) -> APIKey:
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key missing",
            headers={"WWW-Authenticate": "API-Key"},
        )
    
    db_api_key = db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active == True).first()
    if not db_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
            headers={"WWW-Authenticate": "API-Key"},
        )
    # Check expiration
    if db_api_key.expires_at is not None:
        expires = db_api_key.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API Key has expired",
                headers={"WWW-Authenticate": "API-Key"},
            )
    return db_api_key

def get_current_tenant_by_api_key(api_key: APIKey = Depends(get_api_key), db: Session = Depends(get_db)) -> Tenant:
    tenant = db.query(Tenant).filter(Tenant.id == api_key.tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found for API key")
    return tenant

def create_api_key(
    name: str, 
    tenant_id: int, 
    db: Session, 
    expires_at: datetime | None = None
) -> APIKey:
    key = secrets.token_urlsafe(32) # Generate a secure random key
    db_api_key = APIKey(
        tenant_id=tenant_id,
        key=key,
        name=name,
        expires_at=expires_at
    )
    db.add(db_api_key)
    db.commit()
    db.refresh(db_api_key)
    return db_api_key

def revoke_api_key(api_key_id: int, tenant_id: int, db: Session) -> None:
    db_api_key = db.query(APIKey).filter(APIKey.id == api_key_id, APIKey.tenant_id == tenant_id).first()
    if not db_api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API Key not found")
    db_api_key.is_active = False
    db.commit()