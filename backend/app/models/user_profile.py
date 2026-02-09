from sqlalchemy import Column, Integer, String, Boolean, JSON, Text
from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    education = Column(String)
    years_experience = Column(Integer, default=0)
    skills = Column(JSON, nullable=False, default=list)
    resume_text = Column(Text)
    is_career_switcher = Column(Boolean, default=False)
