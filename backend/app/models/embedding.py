"""SQLAlchemy model for storing Titan/pgvector embeddings."""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship

from app.database import Base

# pgvector type — falls back to Text on SQLite (tests / local dev without pgvector)
try:
    from pgvector.sqlalchemy import Vector
    _VECTOR_TYPE = Vector(1536)
except ImportError:
    from sqlalchemy import Text as _Text
    _VECTOR_TYPE = _Text()


class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    # text_type: "resume" | "query" | "jd"
    text_type = Column(String(50), nullable=False, index=True)
    embedding = Column(_VECTOR_TYPE, nullable=True)
    source_text = Column(String(4000), nullable=True)
    meta = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
