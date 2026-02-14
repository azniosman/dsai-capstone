import secrets
from datetime import datetime, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.api_key import APIKey
from app.models.tenant import Tenant
from app.models.user import User, Role
from app.auth import get_current_user, get_current_user_optional, has_role


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


def get_optional_api_key(
    api_key: str = Depends(api_key_header),
    db: Session = Depends(get_db),
) -> APIKey | None:
    """Return validated API key if X-API-Key header is present, else None. Raises when header is present but invalid."""
    if not api_key or not api_key.strip():
        return None
    db_api_key = db.query(APIKey).filter(APIKey.key == api_key, APIKey.is_active == True).first()
    if not db_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key",
            headers={"WWW-Authenticate": "API-Key"},
        )
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


def get_current_tenant_for_read(
    api_key: APIKey | None = Depends(get_optional_api_key),
    user: User | None = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> Tenant:
    """Resolve tenant for read-only endpoints. Requires X-API-Key or JWT; no anonymous access."""
    if api_key is not None:
        tenant = db.query(Tenant).filter(Tenant.id == api_key.tenant_id).first()
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found for API key")
        return tenant
    if user is not None:
        tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found for user",
            )
        return tenant
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide X-API-Key header or Bearer token.",
        headers={"WWW-Authenticate": "Bearer, API-Key"},
    )


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