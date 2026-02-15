from sqlalchemy import Column, Integer, String, DateTime, func

from app.database import Base


class SyncStatus(Base):
    __tablename__ = "sync_status"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, unique=True, nullable=False, index=True)
    last_synced_at = Column(DateTime(timezone=True), server_default=func.now())
    records_synced = Column(Integer, default=0)
    status = Column(String, default="pending")  # "success", "partial", "failed"
    details = Column(String, nullable=True)
