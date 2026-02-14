"""JWT authentication utilities."""

import secrets
from collections import OrderedDict
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.tenant import Tenant
from app.models.user import User, Role

from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# In-memory JTI blacklist with TTL cleanup.
# For production, use Redis or a database table instead.
_revoked_tokens: OrderedDict[str, float] = OrderedDict()  # jti -> expiry timestamp
_MAX_BLACKLIST_SIZE = 10000


def _cleanup_expired_tokens() -> None:
    now = datetime.now(timezone.utc).timestamp()
    while _revoked_tokens:
        jti, exp = next(iter(_revoked_tokens.items()))
        if exp < now:
            _revoked_tokens.pop(jti)
        else:
            break


def revoke_token(jti: str, expires_at: float | None = None) -> None:
    if expires_at is None:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)).timestamp()
    _cleanup_expired_tokens()
    _revoked_tokens[jti] = expires_at
    if len(_revoked_tokens) > _MAX_BLACKLIST_SIZE:
        _revoked_tokens.popitem(last=False)


def is_token_revoked(jti: str) -> bool:
    _cleanup_expired_tokens()
    return jti in _revoked_tokens


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, tenant_id: int) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({
        "exp": expire,
        "jti": secrets.token_urlsafe(32),
        "tenant_id": tenant_id,
    })
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    return jwt.encode(
        {
            "sub": str(user_id),
            "purpose": "refresh",
            "jti": secrets.token_urlsafe(32),
            "exp": expire,
        },
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


def verify_refresh_token(token: str) -> tuple[int, str]:
    """Decode a refresh JWT. Returns (user_id, jti) or raises HTTPException."""
    try:
        payload = jwt.decode(token.strip(), settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        jti = payload.get("jti", "")
        if is_token_revoked(jti):
            raise HTTPException(status_code=401, detail="Refresh token has been revoked")
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        return int(user_id), jti
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


def create_reset_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    return jwt.encode(
        {"sub": str(user_id), "purpose": "reset", "exp": expire},
        settings.secret_key,
        algorithm=settings.jwt_algorithm,
    )


def verify_reset_token(token: str) -> int:
    """Decode a password-reset JWT. Returns user_id or raises HTTPException."""
    try:
        payload = jwt.decode(token.strip(), settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose") != "reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=400, detail="Invalid reset token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")


def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Return user if authenticated, None otherwise."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("purpose"):
            return None  # reject non-access tokens (e.g. reset tokens)
        jti = payload.get("jti", "")
        if jti and is_token_revoked(jti):
            return None
        sub = payload.get("sub")
        if sub is None:
            return None
        user_id = int(sub)
        tenant_id = payload.get("tenant_id")
        if tenant_id is None:
            return None
    except JWTError:
        return None
    from app.models.user import User
    user = db.query(User).filter(User.id == user_id, User.tenant_id == tenant_id).first()
    if user is None or not user.is_active:
        return None
    return user


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """Require authentication."""
    user = get_current_user_optional(token, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_tenant(user: User = Depends(get_current_user)) -> "Tenant":
    """Get the current tenant from the authenticated user."""
    return user.tenant


def has_role(required_roles: list[Role]):
    def role_checker(user: User = Depends(get_current_user)):
        if user.role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return user
    return role_checker
