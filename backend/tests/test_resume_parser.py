"""Tests for resume skill extraction."""

from unittest.mock import patch, MagicMock


def test_extract_skills_empty():
    """Test that empty text returns empty list without calling Gemini."""
    from app.services.resume_parser import extract_skills

    skills = extract_skills("")
    assert skills == []


def test_extract_skills_no_api_key_uses_keyword_fallback():
    """Test that missing Gemini API key falls back to keyword extraction."""
    from app.services.resume_parser import extract_skills

    with patch("app.services.resume_parser.settings") as mock_settings:
        mock_settings.gemini_api_key = None
        skills = extract_skills("Python and Docker experience required.")
    # Keyword fallback should find Python and Docker in the text
    skills_lower = [s.lower() for s in skills]
    assert "python" in skills_lower
    assert "docker" in skills_lower


def test_extract_skills_gemini_parsing():
    """Test that Gemini response is correctly parsed into a skill list."""
    from app.services.resume_parser import extract_skills

    mock_response = MagicMock()
    mock_response.text = '{"skills": ["Python", "Docker", "AWS", "React", "PostgreSQL"]}'

    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response

    with patch("app.services.resume_parser.settings") as mock_settings, \
         patch("app.services.resume_parser.genai") as mock_genai:
        mock_settings.gemini_api_key = "test-key"
        mock_settings.gemini_model = "gemini-pro"
        mock_genai.GenerativeModel.return_value = mock_model

        text = (
            "Experienced software engineer with 5 years of Python and Docker. "
            "Proficient in React, AWS, and PostgreSQL."
        )
        skills = extract_skills(text)

    skills_lower = [s.lower() for s in skills]
    assert "python" in skills_lower
    assert "docker" in skills_lower
    assert "aws" in skills_lower
    assert "react" in skills_lower
    assert "postgresql" in skills_lower


def test_extract_skills_gemini_error_uses_keyword_fallback():
    """Test that a Gemini API error falls back to keyword extraction gracefully."""
    from app.services.resume_parser import extract_skills

    with patch("app.services.resume_parser.settings") as mock_settings, \
         patch("app.services.resume_parser.genai") as mock_genai:
        mock_settings.gemini_api_key = "test-key"
        mock_settings.gemini_model = "gemini-pro"
        mock_genai.GenerativeModel.side_effect = Exception("API error")

        # Text with no taxonomy skills → keyword fallback returns []
        skills = extract_skills("Some resume text with no known skills.")
    assert skills == []

    with patch("app.services.resume_parser.settings") as mock_settings, \
         patch("app.services.resume_parser.genai") as mock_genai:
        mock_settings.gemini_api_key = "test-key"
        mock_settings.gemini_model = "gemini-pro"
        mock_genai.GenerativeModel.side_effect = Exception("API error")

        # Text with known skills → keyword fallback finds them
        skills = extract_skills("Experience with Python and Docker required.")
    skills_lower = [s.lower() for s in skills]
    assert "python" in skills_lower
