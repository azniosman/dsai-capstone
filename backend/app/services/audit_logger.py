from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog
from datetime import datetime
from typing import Any


def log_audit_event(
    db: Session,
    tenant_id: int,
    user_id: int | None,
    action: str,
    details: dict[str, Any] | None = None,
) -> None:
    audit_log_entry = AuditLog(
        tenant_id=tenant_id,
        user_id=user_id,
        action=action,
        timestamp=datetime.now(),
        details=details,
    )
    db.add(audit_log_entry)
    db.commit()
    db.refresh(audit_log_entry)
