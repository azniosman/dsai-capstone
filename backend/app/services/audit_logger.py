"""Audit logging utility for tracking user and system events."""

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)


def log_audit_event(
    db: Session,
    tenant_id: int,
    user_id: int | None,
    action: str,
    details: dict[str, Any] | None = None,
) -> None:
    """Record an audit event. Logs on failure but does not re-raise, so auth and other callers continue."""
    try:
        if details:
            details = {
                k: (v[:1000] + "...[truncated]" if isinstance(v, str) and len(v) > 1000 else v)
                for k, v in details.items()
            }
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
        logger.exception(
            "Audit log write failed: tenant_id=%s user_id=%s action=%s",
            tenant_id,
            user_id,
            action,
        )
