"""SQLAlchemy model for storing structured AI analysis results."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON

from app.database import Base


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_embedding_id = Column(Integer, ForeignKey("embeddings.id", ondelete="SET NULL"), nullable=True)
    # analysis_type: "gap_analysis" | "role_match" | etc.
    analysis_type = Column(String(100), nullable=False, index=True)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
