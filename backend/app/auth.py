"""JWT authentication utilities."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# In-memory JTI blacklist (cleared on restart — acceptable for single-process demo)
_revoked_tokens: set[str] = set()


def revoke_token(jti: str) -> None:
    _revoked_tokens.add(jti)


def is_token_revoked(jti: str) -> bool:
    return jti in _revoked_tokens


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({
        "exp": expire,
        "jti": secrets.token_urlsafe(32),
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
    except JWTError:
        return None
    from app.models.user import User
    user = db.get(User, user_id)
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
