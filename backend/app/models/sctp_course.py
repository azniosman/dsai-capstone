from sqlalchemy import Column, Integer, String, JSON, Boolean, Float
from app.database import Base


class SCTPCourse(Base):
    __tablename__ = "sctp_courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    provider = Column(String, nullable=False)
    skills_taught = Column(JSON, nullable=False, default=list)
    duration_weeks = Column(Integer)
    level = Column(String, default="intermediate")
    url = Column(String)
    certification = Column(String)
    # SkillsFuture Credit fields
    skillsfuture_eligible = Column(Boolean, default=True)
    skillsfuture_credit_amount = Column(Float, default=0.0)
    course_fee = Column(Float, default=0.0)
    nett_fee_after_subsidy = Column(Float, default=0.0)
