from sqlalchemy import Column, Integer, String, Boolean, JSON, Text, DateTime, func, ForeignKey
from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    education = Column(String)
    years_experience = Column(Integer, default=0)
    age = Column(Integer, nullable=True)
    skills = Column(JSON, nullable=False, default=list)
    resume_text = Column(Text)
    is_career_switcher = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
