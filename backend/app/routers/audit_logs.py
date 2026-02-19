from typing import Any, Optional, List
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.user import User, Role
from app.auth import has_role


router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


class AuditLogResponse(BaseModel):
    id: int
    tenant_id: int
    user_id: Optional[int]
    action: str
    timestamp: datetime
    details: Optional[dict[str, Any]]
    model_config = {"from_attributes": True}


@router.get("/", response_model=list[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: User = Depends(has_role([Role.ADMIN])),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    logs = db.query(AuditLog).filter(AuditLog.tenant_id == current_user.tenant_id).order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs
