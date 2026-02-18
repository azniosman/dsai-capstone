import pytest
from app.services.gap_analyzer import analyze_gaps
from app.models.user_profile import UserProfile
from app.models.job_role import JobRole

def test_analyze_gaps_empty_skills(db_session, sample_role):
    """Test gap analysis when user has no skills."""
    # Seed a role
    role = JobRole(**sample_role)
    db_session.add(role)
    db_session.commit()
    
    # Create profile with no skills
    profile = UserProfile(
        name="No Skills User",
        skills=[],
        tenant_id=db_session._test_tenant_id
    )
    db_session.add(profile)
    db_session.commit()
    
    # Analyze
    gaps = analyze_gaps(profile, db_session, tenant_id=db_session._test_tenant_id)
    
    assert len(gaps) > 0
    assert gaps[0].match_score == 0.0 # No skills = 0 score
    assert len(gaps[0].gaps) > 0
    assert all(g.user_level == 0.0 for g in gaps[0].gaps)

def test_analyze_gaps_with_role_mismatch(db_session, sample_role, sample_profile_data):
    """Test gap analysis when top recommendation is somehow invalid."""
    # Seed a role
    role = JobRole(**sample_role)
    db_session.add(role)
    db_session.commit()
    
    # Create profile
    profile = UserProfile(**sample_profile_data)
    profile.tenant_id = db_session._test_tenant_id
    db_session.add(profile)
    db_session.commit()
    
    # Analyze
    gaps = analyze_gaps(profile, db_session, tenant_id=db_session._test_tenant_id)
    assert len(gaps) > 0
    assert gaps[0].role_title == role.title
