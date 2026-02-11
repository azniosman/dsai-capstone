"""Authentication endpoints — register, login, me, password management, account settings."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token, create_reset_token, verify_reset_token,
    get_current_user, hash_password, verify_password,
)
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ---------- Schemas ----------

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str


class TokenResponse(BaseModel):
    access_token: str
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


# ---------- Registration / Login ----------

@router.post("/register", response_model=UserResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter_by(email=payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
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
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


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
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "If the email exists, a reset link has been generated."}
    token = create_reset_token(user.id)
    # In production: send email. For demo: return token directly.
    return {"message": "If the email exists, a reset link has been generated.", "reset_token": token}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = verify_reset_token(payload.token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully"}
