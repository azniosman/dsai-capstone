from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, JSON
from app.database import Base
from datetime import datetime


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True) # Nullable for unauthenticated actions
    action = Column(String, nullable=False) # e.g., "user.login", "profile.update", "api_key.create"
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    details = Column(JSON, nullable=True) # JSON string or plain text for additional context
