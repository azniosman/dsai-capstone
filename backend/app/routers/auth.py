"""Authentication endpoints — register, login, me, password management, account settings."""

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token, create_refresh_token, create_reset_token,
    verify_refresh_token, verify_reset_token, revoke_token,
    get_current_user, hash_password, verify_password,
)
from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    password_confirm: str
    name: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError("Invalid email format")
        return v

    @field_validator("password_confirm")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class UpdateAccountRequest(BaseModel):
    name: str | None = None
    email: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


# ---------- Lockout helpers ----------

def _check_account_lockout(user: User) -> None:
    if user.locked_until:
        locked = user.locked_until
        now = datetime.now(timezone.utc)
        # Normalize to offset-aware (SQLite stores naive datetimes)
        if locked.tzinfo is None:
            locked = locked.replace(tzinfo=timezone.utc)
        if locked <= now:
            return
        remaining = int((locked - now).total_seconds())
        raise HTTPException(
            status_code=429,
            detail=f"Account locked. Try again in {remaining} seconds.",
        )


def _increment_failed_attempts(user: User, db: Session) -> None:
    user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
    if user.failed_login_attempts >= settings.max_login_attempts:
        user.locked_until = datetime.now(timezone.utc) + timedelta(
            minutes=settings.lockout_duration_minutes
        )
    db.commit()


def _reset_failed_attempts(user: User, db: Session) -> None:
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()


# ---------- Registration / Login ----------

@router.post("/register", response_model=UserResponse)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter_by(email=payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Registration failed. Please try again.")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    email = form.username.strip().lower()
    user = db.query(User).filter_by(email=email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    _check_account_lockout(user)

    if not verify_password(form.password, user.hashed_password):
        _increment_failed_attempts(user, db)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _reset_failed_attempts(user, db)
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ---------- Token refresh / logout ----------

@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    user_id, old_jti = verify_refresh_token(payload.refresh_token)
    revoke_token(old_jti)

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token(user.id)
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
def logout(payload: LogoutRequest):
    try:
        _, jti = verify_refresh_token(payload.refresh_token)
        revoke_token(jti)
    except HTTPException:
        pass  # Already invalid/expired — still "logged out"
    return {"message": "Logged out successfully"}


# ---------- Current user ----------

@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserResponse)
def update_account(
    payload: UpdateAccountRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.email and payload.email != user.email:
        if db.query(User).filter(User.email == payload.email).first():
            raise HTTPException(status_code=400, detail="Email already in use")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/me")
def delete_account(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.models.user_profile import UserProfile

    db.query(UserProfile).filter(UserProfile.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": "Account deleted"}


# ---------- Password management ----------

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"message": "If the email exists, a reset link has been generated."}
    token = create_reset_token(user.id)
    # In production: send email. For demo: return token directly.
    return {"message": "If the email exists, a reset link has been generated.", "reset_token": token}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = verify_reset_token(payload.token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    user.hashed_password = hash_password(payload.new_password)
    _reset_failed_attempts(user, db)
    db.commit()
    return {"message": "Password reset successfully"}
