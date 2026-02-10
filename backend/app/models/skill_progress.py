from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base


class SkillProgress(Base):
    __tablename__ = "skill_progress"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, nullable=False, index=True)
    skill = Column(String, nullable=False)
    level = Column(Float, default=0.0)  # 0.0, 0.5, 1.0
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())
