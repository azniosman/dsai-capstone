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
    get_current_user, hash_password, verify_password, get_current_user_optional, has_role
)
from app.config import settings
from app.database import get_db
from app.limiter import limiter
from app.models.user import User, Role # Added Role
from app.models.tenant import Tenant
from app.services.audit_logger import log_audit_event # Added import

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    password_confirm: str
    name: str = Field(min_length=1)
    tenant_name: str = Field(min_length=1)
    role: str | None = None # Added optional role field

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
    role: str
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
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    existing = db.query(User).filter_by(email=payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Registration failed. Please try again.")

    tenant = db.query(Tenant).filter_by(name=payload.tenant_name).first()
    if not tenant:
        tenant = Tenant(name=payload.tenant_name)
        db.add(tenant)
        db.commit()
        db.refresh(tenant)
    
    user_role = Role.MEMBER
    if payload.role:
        if current_user and current_user.role == Role.ADMIN:
            try:
                user_role = Role(payload.role)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid role specified")
        else:
            raise HTTPException(status_code=403, detail="Only admins can assign roles during registration")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        name=payload.name,
        tenant_id=tenant.id,
        role=user_role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_audit_event(db, tenant.id, user.id, "user.register", {"email": user.email, "name": user.name, "role": str(user.role)})
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    if settings.sso_enabled:
        raise HTTPException(status_code=status.HTTP_307_TEMPORARY_REDIRECT, headers={"Location": "/sso/login"}) # Placeholder for SSO login

    email = form.username.strip().lower()
    user = db.query(User).filter_by(email=email).first()

    if not user:
        log_audit_event(db, 1, None, "user.login.failed", {"email": email, "reason": "user not found"})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        log_audit_event(db, user.tenant_id, user.id, "user.login.failed", {"email": email, "reason": "account deactivated"})
        raise HTTPException(status_code=403, detail="Account is deactivated")

    _check_account_lockout(user)

    if not verify_password(form.password, user.hashed_password):
        _increment_failed_attempts(user, db)
        log_audit_event(db, user.tenant_id, user.id, "user.login.failed", {"email": email, "reason": "invalid password"})
        raise HTTPException(status_code=401, detail="Invalid credentials")

    _reset_failed_attempts(user, db)
    access_token = create_access_token({"sub": str(user.id)}, tenant_id=user.tenant_id)
    refresh_token = create_refresh_token(user.id)
    log_audit_event(db, user.tenant_id, user.id, "user.login.success", {"email": email})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ---------- Token refresh / logout ----------

@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("10/minute")
def refresh(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    user_id, old_jti = verify_refresh_token(payload.refresh_token)
    revoke_token(old_jti)

    user = db.get(User, user_id)
    if not user or not user.is_active:
        log_audit_event(db, 1, user_id, "user.refresh.failed", {"reason": "user not found or deactivated"})
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    access_token = create_access_token({"sub": str(user.id)}, tenant_id=user.tenant_id)
    new_refresh_token = create_refresh_token(user.id)
    log_audit_event(db, user.tenant_id, user.id, "user.refresh.success")
    return TokenResponse(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
def logout(payload: LogoutRequest, db: Session = Depends(get_db)): # Add db dependency
    try:
        user_id, jti = verify_refresh_token(payload.refresh_token)
        revoke_token(jti)
        # Log successful logout
        user = db.get(User, user_id)
        if user:
            log_audit_event(db, user.tenant_id, user.id, "user.logout.success")
    except HTTPException:
        # Log failed logout attempt if possible
        log_audit_event(db, 1, None, "user.logout.failed", {"reason": "invalid or expired token"})
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
    
    # Prevent user from changing their own role
    if hasattr(payload, 'role') and payload.role != user.role:
        raise HTTPException(status_code=403, detail="Cannot change your own role")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    log_audit_event(db, user.tenant_id, user.id, "user.update_account", {"user_id": user.id, "changes": payload.model_dump(exclude_unset=True)})
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
    log_audit_event(db, user.tenant_id, user.id, "user.delete_account", {"user_id": user.id, "email": user.email})
    return {"message": "Account deleted"}


# ---------- Password management ----------

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        log_audit_event(db, user.tenant_id, user.id, "user.change_password.failed", {"reason": "incorrect current password"})
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    log_audit_event(db, user.tenant_id, user.id, "user.change_password.success")
    return {"message": "Password updated successfully"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    if not user:
        log_audit_event(db, 1, None, "user.forgot_password.request", {"email": email, "status": "user_not_found"})
        return {"message": "If the email exists, a reset link has been generated."}
    token = create_reset_token(user.id)
    log_audit_event(db, user.tenant_id, user.id, "user.forgot_password.request", {"email": email, "status": "link_generated"})
    # In production: send email. For demo: return token directly.
    return {"message": "If the email exists, a reset link has been generated.", "reset_token": token}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = verify_reset_token(payload.token)
    user = db.get(User, user_id)
    if not user:
        log_audit_event(db, 1, user_id, "user.reset_password.failed", {"reason": "invalid reset token"})
        raise HTTPException(status_code=400, detail="Invalid reset token")
    user.hashed_password = hash_password(payload.new_password)
    _reset_failed_attempts(user, db)
    db.commit()
    log_audit_event(db, user.tenant_id, user.id, "user.reset_password.success")
    return {"message": "Password reset successfully"}


class UpdateUserRoleRequest(BaseModel):
    role: str

@router.patch("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: int,
    payload: UpdateUserRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role([Role.ADMIN])),
):
    target_user = db.query(User).filter(User.id == user_id, User.tenant_id == current_user.tenant_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        new_role = Role(payload.role)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid role specified")
    
    target_user.role = new_role
    db.commit()
    db.refresh(target_user)
    log_audit_event(
        db, 
        current_user.tenant_id, 
        current_user.id, 
        "user.update_role", 
        {"target_user_id": user_id, "new_role": str(new_role), "admin_user_id": current_user.id}
    )
    return target_user
