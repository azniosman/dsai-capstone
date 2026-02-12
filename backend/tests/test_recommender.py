"""Tests for the hybrid recommender logic."""

from unittest.mock import patch, MagicMock
import numpy as np


def _mock_encode(texts, normalize_embeddings=True):
    embeddings = []
    for text in texts:
        seed = sum(ord(c) for c in text.lower())
        local_rng = np.random.RandomState(seed)
        vec = local_rng.randn(384).astype(np.float32)
        vec = vec / np.linalg.norm(vec)
        embeddings.append(vec)
    return np.array(embeddings)


@patch("app.ml.embeddings.get_model")
def test_rule_score(mock_model):
    """Test rule-based scoring for education and experience."""
    mock_model.return_value.encode = _mock_encode
    from app.services.recommender import _rule_score

    profile = MagicMock()
    profile.education = "bachelor"
    profile.years_experience = 3

    role = MagicMock()
    role.education_level = "bachelor"
    role.min_experience_years = 2

    score = _rule_score(profile, role)
    assert score == 1.0  # Both education and experience match


@patch("app.ml.embeddings.get_model")
def test_rule_score_underqualified(mock_model):
    """Test rule-based scoring when underqualified."""
    mock_model.return_value.encode = _mock_encode
    from app.services.recommender import _rule_score

    profile = MagicMock()
    profile.education = "diploma"
    profile.years_experience = 0

    role = MagicMock()
    role.education_level = "master"
    role.min_experience_years = 5

    score = _rule_score(profile, role)
    assert score < 0.5


@patch("app.ml.embeddings.get_model")
def test_career_switcher_bonus(mock_model):
    """Test career switcher bonus applied correctly."""
    mock_model.return_value.encode = _mock_encode
    from app.services.recommender import _career_switcher_bonus

    profile = MagicMock()
    profile.is_career_switcher = True
    profile.years_experience = 0

    friendly_role = MagicMock()
    friendly_role.career_switcher_friendly = True

    unfriendly_role = MagicMock()
    unfriendly_role.career_switcher_friendly = False

    # 0 years experience → full bonus (1.0)
    assert _career_switcher_bonus(profile, friendly_role) == 1.0
    assert _career_switcher_bonus(profile, unfriendly_role) == 0.0

    # Gradient: 5 years → 0.5 bonus
    profile.years_experience = 5
    assert _career_switcher_bonus(profile, friendly_role) == 0.5

    # 10+ years → 0 bonus (tapered out)
    profile.years_experience = 10
    assert _career_switcher_bonus(profile, friendly_role) == 0.0


@patch("app.services.skill_matcher.get_skill_category", return_value="technical")
@patch("app.ml.embeddings.get_model")
def test_get_recommendations(mock_model, mock_category, db_session, sample_profile, sample_role):
    """Test end-to-end recommendation pipeline with in-memory DB."""
    mock_model.return_value.encode = _mock_encode

    from app.models.user_profile import UserProfile
    from app.models.job_role import JobRole
    from app.services.recommender import get_recommendations

    # Create test data
    profile = UserProfile(**sample_profile)
    db_session.add(profile)

    role = JobRole(**sample_role)
    db_session.add(role)
    db_session.commit()
    db_session.refresh(profile)

    recs = get_recommendations(profile, db_session, top_n=5)
    assert len(recs) == 1
    assert recs[0].title == "Data Engineer"
    assert 0.0 <= recs[0].match_score <= 1.0
    assert isinstance(recs[0].matched_skills, list)
