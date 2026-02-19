from datetime import date
from sqlalchemy import Column, Integer, Float, ForeignKey, Date
from sqlalchemy.orm import relationship

from app.database import Base

class ProfileSnapshot(Base):
    __tablename__ = "profile_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.id"), nullable=False, index=True)
    snapshot_date = Column(Date, default=date.today, nullable=False, index=True)
    
    # Metrics
    skills_count = Column(Integer, default=0)
    recommendations_count = Column(Integer, default=0)
    gaps_count = Column(Integer, default=0)
    career_readiness = Column(Float, default=0.0)

    # Relationship
    profile = relationship("UserProfile", back_populates="snapshots")
