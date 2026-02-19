import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from app.services.dashboard_service import capture_daily_snapshot, get_dashboard_deltas
from app.models.snapshot import ProfileSnapshot

# Mock metrics for testing
METRICS_DAY_1 = {
    "skills_count": 5,
    "recommendations_count": 10,
    "gaps_count": 3,
    "career_readiness": 50.0,
}

METRICS_DAY_2 = {
    "skills_count": 6,          # +1
    "recommendations_count": 12, # +2
    "gaps_count": 2,           # -1
    "career_readiness": 55.0,
}

def test_capture_snapshot_creates_new(db_session, sample_profile):
    """Test that a new snapshot is created if none exists."""
    from app.models.user_profile import UserProfile
    profile = UserProfile(**sample_profile)
    db_session.add(profile)
    db_session.commit()

    # Capture 
    snap = capture_daily_snapshot(profile, db_session, METRICS_DAY_1)
    
    assert snap is not None
    assert snap.skills_count == 5
    assert snap.snapshot_date == date.today()
    
    # Verify DB
    saved = db_session.query(ProfileSnapshot).filter_by(profile_id=profile.id).first()
    assert saved is not None

def test_capture_snapshot_idempotent(db_session, sample_profile):
    """Test that calling capture again on the same day doesn't create a duplicate."""
    from app.models.user_profile import UserProfile
    profile = UserProfile(**sample_profile)
    db_session.add(profile)
    db_session.commit()

    s1 = capture_daily_snapshot(profile, db_session, METRICS_DAY_1)
    s2 = capture_daily_snapshot(profile, db_session, METRICS_DAY_1)
    
    assert s1.id == s2.id
    count = db_session.query(ProfileSnapshot).count()
    assert count == 1

@patch("app.services.dashboard_service.date")
def test_get_dashboard_deltas(mock_date, db_session, sample_profile):
    """Test delta calculation between two days."""
    # Setup dates
    today = date(2025, 1, 10)
    yesterday = date(2025, 1, 9)
    
    # Configure mock to return 'yesterday' first, then 'today'
    # We need to control what 'date.today()' returns inside the functions
    
    from app.models.user_profile import UserProfile
    profile = UserProfile(**sample_profile)
    db_session.add(profile)
    db_session.commit()

    # 1. Simulate Yesterday
    mock_date.today.return_value = yesterday
    capture_daily_snapshot(profile, db_session, METRICS_DAY_1)
    
    # 2. Simulate Today
    mock_date.today.return_value = today
    
    # Get deltas using Day 2 metrics
    deltas = get_dashboard_deltas(profile, db_session, METRICS_DAY_2)
    
    assert deltas["skills_delta"] == 1        # 6 - 5
    assert deltas["recommendations_delta"] == 2 # 12 - 10
    assert deltas["gaps_delta"] == -1         # 2 - 3
