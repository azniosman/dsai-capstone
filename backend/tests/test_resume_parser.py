"""Tests for resume skill extraction."""

from unittest.mock import patch, MagicMock


def test_extract_skills_empty():
    """Test that empty text returns a zeroed-out dict without calling Bedrock."""
    from app.services.resume_parser import extract_skills

    result = extract_skills("")
    assert isinstance(result, dict)
    assert result["skills"] == []
    assert result["readiness_score"] == 0


def test_extract_skills_bedrock_parsing():
    """Test that a successful Bedrock response is parsed into the structured dict."""
    from app.services.resume_parser import extract_skills

    mock_bedrock_response = (
        '{"readiness_score": 75, "strengths": ["Python", "Cloud"], '
        '"missing_skills": ["Kubernetes"], "recommended_courses": ["AWS SAA"], '
        '"suggested_roles": ["Cloud Engineer"], '
        '"skills": ["Python", "Docker", "AWS", "React", "PostgreSQL"]}'
    )

    with patch("app.services.resume_parser.bedrock_service") as mock_bedrock:
        mock_bedrock.invoke_model.return_value = mock_bedrock_response

        text = (
            "Experienced software engineer with 5 years of Python and Docker. "
            "Proficient in React, AWS, and PostgreSQL."
        )
        result = extract_skills(text)

    assert isinstance(result, dict)
    skills_lower = [s.lower() for s in result["skills"]]
    assert "python" in skills_lower
    assert "docker" in skills_lower
    assert "aws" in skills_lower
    assert result["readiness_score"] == 75
    assert "Kubernetes" in result["missing_skills"]


def test_extract_skills_bedrock_error_uses_keyword_fallback():
    """Test that a Bedrock error falls back to keyword extraction gracefully."""
    from app.services.resume_parser import extract_skills

    with patch("app.services.resume_parser.bedrock_service") as mock_bedrock:
        mock_bedrock.invoke_model.side_effect = Exception("Bedrock unavailable")

        # Text with known skills → keyword fallback finds them
        result = extract_skills("Experience with Python and Docker required.")

    assert isinstance(result, dict)
    skills_lower = [s.lower() for s in result["skills"]]
    assert "python" in skills_lower
    assert "docker" in skills_lower
    # Fallback provides default readiness score
    assert result["readiness_score"] == 50


def test_extract_skills_bedrock_error_no_keywords():
    """Test keyword fallback returns empty skills list when text has no known skills."""
    from app.services.resume_parser import extract_skills

    with patch("app.services.resume_parser.bedrock_service") as mock_bedrock:
        mock_bedrock.invoke_model.side_effect = Exception("Bedrock unavailable")

        result = extract_skills("Some resume text with no known skills.")

    assert isinstance(result, dict)
    assert result["skills"] == []
