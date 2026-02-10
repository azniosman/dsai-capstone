from sqlalchemy import Column, Integer, String, Boolean, JSON, Text, DateTime, func
from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=True)  # FK to users, nullable for anonymous
    name = Column(String, nullable=False)
    education = Column(String)
    years_experience = Column(Integer, default=0)
    skills = Column(JSON, nullable=False, default=list)
    resume_text = Column(Text)
    is_career_switcher = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
