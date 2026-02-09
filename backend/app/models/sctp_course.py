from sqlalchemy import Column, Integer, String, JSON
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
