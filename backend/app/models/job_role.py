from sqlalchemy import Column, Integer, String, Boolean, Float, JSON
from app.database import Base


class JobRole(Base):
    __tablename__ = "job_roles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    category = Column(String, nullable=False)
    description = Column(String, nullable=False)
    required_skills = Column(JSON, nullable=False, default=list)
    preferred_skills = Column(JSON, nullable=False, default=list)
    min_experience_years = Column(Integer, default=0)
    education_level = Column(String, default="bachelor")
    career_switcher_friendly = Column(Boolean, default=False)
    salary_range = Column(String)
