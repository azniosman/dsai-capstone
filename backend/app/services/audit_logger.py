"""Audit logging utility for tracking user and system events."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_audit_event(
    db: Session,
    tenant_id: int,
    user_id: int | None,
    action: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Record an audit event. Silently ignores failures to avoid disrupting the caller."""
    try:
        entry = AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            timestamp=datetime.now(timezone.utc),
            details=details,
        )
        db.add(entry)
        db.commit()
    except Exception:
        db.rollback()
