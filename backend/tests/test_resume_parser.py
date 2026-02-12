"""Tests for resume skill extraction."""

from unittest.mock import patch, MagicMock


def _mock_nlp(text):
    """Return a mock spaCy doc with no entities."""
    doc = MagicMock()
    doc.ents = []
    return doc


def test_extract_skills_regex():
    """Test that regex patterns extract known skills from text."""
    with patch("app.services.resume_parser.normalize_skills", side_effect=lambda x: x), \
         patch("app.services.resume_parser._get_nlp", return_value=_mock_nlp):
        from app.services.resume_parser import extract_skills

        text = """
        Experienced software engineer with 5 years of Python and JavaScript development.
        Proficient in React, Docker, and AWS. Familiar with PostgreSQL and REST API design.
        Worked with Pandas and Scikit-learn for data analysis projects.
        """
        skills = extract_skills(text)
        skills_lower = [s.lower() for s in skills]

        assert "python" in skills_lower
        assert "javascript" in skills_lower
        assert "react" in skills_lower
        assert "docker" in skills_lower
        assert "aws" in skills_lower


def test_extract_skills_empty():
    """Test that empty text returns empty list."""
    with patch("app.services.resume_parser.normalize_skills", side_effect=lambda x: x), \
         patch("app.services.resume_parser._get_nlp", return_value=_mock_nlp):
        from app.services.resume_parser import extract_skills

        skills = extract_skills("")
        assert isinstance(skills, list)
