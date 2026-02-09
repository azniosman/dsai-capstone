"""Tests for skill matching logic."""

from unittest.mock import patch
import numpy as np


def _mock_encode(texts, normalize_embeddings=True):
    """Create deterministic mock embeddings based on text similarity."""
    rng = np.random.RandomState(42)
    # Create consistent embeddings: same text = same embedding
    embeddings = []
    for text in texts:
        seed = sum(ord(c) for c in text.lower())
        local_rng = np.random.RandomState(seed)
        vec = local_rng.randn(384).astype(np.float32)
        vec = vec / np.linalg.norm(vec)
        embeddings.append(vec)
    return np.array(embeddings)


@patch("app.ml.embeddings.get_model")
def test_match_skills_exact(mock_model):
    """Exact text matches should score 1.0."""
    mock_model.return_value.encode = _mock_encode
    from app.services.skill_matcher import match_skills

    scores = match_skills(
        user_skills=["Python", "SQL", "Docker"],
        required_skills=["Python", "SQL", "Kubernetes"],
    )
    assert scores["Python"] == 1.0
    assert scores["SQL"] == 1.0
    # Kubernetes not in user skills — depends on embedding similarity
    assert isinstance(scores["Kubernetes"], float)


@patch("app.ml.embeddings.get_model")
def test_content_similarity(mock_model):
    """Content similarity should return a float between 0 and 1."""
    mock_model.return_value.encode = _mock_encode
    from app.services.skill_matcher import compute_content_similarity

    sim = compute_content_similarity(
        user_skills=["Python", "SQL", "Docker"],
        required_skills=["Python", "SQL", "Spark", "Airflow"],
    )
    assert 0.0 <= sim <= 1.0


@patch("app.ml.embeddings.get_model")
def test_empty_skills(mock_model):
    """Empty user skills should result in all zeros."""
    mock_model.return_value.encode = _mock_encode
    from app.services.skill_matcher import match_skills

    scores = match_skills(
        user_skills=[],
        required_skills=["Python", "SQL"],
    )
    assert all(v == 0.0 for v in scores.values())
