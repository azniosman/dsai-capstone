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

    # Create a default tenant for tests
    from app.models.tenant import Tenant
    tenant = Tenant(name="TestTenant")
    session.add(tenant)
    session.commit()
    session.refresh(tenant)

    # Store tenant_id for fixtures to use
    session._test_tenant_id = tenant.id

    yield session
    session.close()


@pytest.fixture
def sample_profile(db_session):
    """Return a sample user profile dict."""
    return {
        "name": "Test User",
        "education": "bachelor",
        "years_experience": 3,
        "skills": ["Python", "SQL", "Pandas", "Docker", "AWS"],
        "resume_text": None,
        "is_career_switcher": True,
        "tenant_id": db_session._test_tenant_id,
    }


@pytest.fixture
def sample_role(db_session):
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
        "tenant_id": db_session._test_tenant_id,
    }
