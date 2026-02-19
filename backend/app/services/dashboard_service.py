from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.snapshot import ProfileSnapshot
from app.models.user_profile import UserProfile

def capture_daily_snapshot(profile: UserProfile, db: Session, metrics: dict):
    """
    Capture a snapshot of the profile's current metrics for today.
    If a snapshot already exists for today, do nothing (or update if needed).
    """
    today = date.today()
    existing = db.query(ProfileSnapshot).filter(
        ProfileSnapshot.profile_id == profile.id,
        ProfileSnapshot.snapshot_date == today
    ).first()

    if existing:
        # Optional: Update if metrics changed significantly, but for now we stick to "first daily snapshot"
        return existing

    snapshot = ProfileSnapshot(
        profile_id=profile.id,
        snapshot_date=today,
        skills_count=metrics.get("skills_count", 0),
        recommendations_count=metrics.get("recommendations_count", 0),
        gaps_count=metrics.get("gaps_count", 0),
        career_readiness=metrics.get("career_readiness", 0.0),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot

def get_dashboard_deltas(profile: UserProfile, db: Session, current_metrics: dict) -> dict:
    """
    Calculate deltas by comparing current metrics to the most recent previous snapshot
    (e.g., yesterday or up to 7 days ago).
    """
    today = date.today()
    
    # Find the most recent snapshot before today
    previous = (
        db.query(ProfileSnapshot)
        .filter(
            ProfileSnapshot.profile_id == profile.id,
            ProfileSnapshot.snapshot_date < today
        )
        .order_by(desc(ProfileSnapshot.snapshot_date))
        .first()
    )

    if not previous:
        return {
            "skills_delta": 0,
            "recommendations_delta": 0,
            "gaps_delta": 0,
        }

    return {
        "skills_delta": current_metrics["skills_count"] - previous.skills_count,
        "recommendations_delta": current_metrics["recommendations_count"] - previous.recommendations_count,
        "gaps_delta": current_metrics["gaps_count"] - previous.gaps_count,
    }
