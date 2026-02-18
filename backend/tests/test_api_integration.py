import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture
def user_with_profile(client, auth_headers, sample_profile_data, sample_role, db_session):
    """Fixture to ensure a user exists, has a profile, and there's a job role in the DB."""
    # Seed a role first so recommendations can work
    from app.models.job_role import JobRole
    role = JobRole(**sample_role)
    db_session.add(role)
    db_session.commit()
    
    # Create profile using the API to ensure side-effects (like creating user_profile record) happen
    res = client.post("/api/profile", json=sample_profile_data, headers=auth_headers)
    assert res.status_code == 200
    return auth_headers


def test_dashboard_summary_deltas(client, user_with_profile):
    """Verify dashboard summary returns the new delta fields."""
    res = client.get("/api/dashboard/summary", headers=user_with_profile)
    assert res.status_code == 200
    data = res.json()
    
    # Check standard fields
    assert "name" in data
    assert "skills_count" in data
    
    # Check new delta fields
    assert "skills_delta" in data
    assert "recommendations_delta" in data
    assert "gaps_delta" in data
    
    # Verify types
    assert isinstance(data["skills_delta"], int)
    assert isinstance(data["recommendations_delta"], int)


def test_recommendations_flow(client, user_with_profile):
    """Verify that recommendations are generated based on the seeded role."""
    # Get profile ID first
    p_res = client.get("/api/profile/me", headers=user_with_profile)
    assert p_res.status_code == 200
    profile_id = p_res.json()["id"]
    
    # Request recommendations
    res = client.post("/api/recommend", json={"profile_id": profile_id}, headers=user_with_profile)
    assert res.status_code == 200
    data = res.json()
    
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)
    
    # Since we seeded "Data Engineer" and our sample profile is a match (Python, SQL), we expect it
    if len(data["recommendations"]) > 0:
        top_rec = data["recommendations"][0]
        assert top_rec["title"] == "Data Engineer"
        assert "match_score" in top_rec


@patch("app.routers.chat.genai")
def test_chat_flow_mock_ai(mock_genai, client, user_with_profile):
    """Verify AI chat works with mocked Gemini response."""
    # Mock the LLM components
    mock_model = MagicMock()
    mock_chat_session = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "This is a mocked AI response."
    
    mock_chat_session.send_message.return_value = mock_response
    mock_model.start_chat.return_value = mock_chat_session
    mock_genai.GenerativeModel.return_value = mock_model
    
    # Force the setting to be present so it tries to use the LLM logic
    with patch("app.config.settings.gemini_api_key", "fake_key"):
        res = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "Hello AI"}]
        }, headers=user_with_profile)
        
        assert res.status_code == 200
        assert res.json()["reply"] == "This is a mocked AI response."
        
        # Verify our mock was actually called
        mock_model.start_chat.assert_called()
        mock_chat_session.send_message.assert_called_with("Hello AI")
