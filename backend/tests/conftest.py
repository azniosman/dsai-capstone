import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base


@pytest.fixture
def db_session():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def sample_profile():
    """Return a sample user profile dict."""
    return {
        "name": "Test User",
        "education": "bachelor",
        "years_experience": 3,
        "skills": ["Python", "SQL", "Pandas", "Docker", "AWS"],
        "resume_text": None,
        "is_career_switcher": True,
    }


@pytest.fixture
def sample_role():
    """Return a sample job role dict."""
    return {
        "title": "Data Engineer",
        "category": "Data & Analytics",
        "description": "Design and build data pipelines",
        "required_skills": ["Python", "SQL", "Spark", "Airflow", "AWS"],
        "preferred_skills": ["Kafka", "dbt", "Snowflake"],
        "min_experience_years": 2,
        "education_level": "bachelor",
        "career_switcher_friendly": True,
        "salary_range": "SGD 5,000 - 8,000",
    }
