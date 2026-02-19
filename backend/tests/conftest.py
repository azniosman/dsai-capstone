import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.limiter import limiter

# Setup in-memory DB specific for testing
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh in-memory database for each test."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    
    # Create a default tenant for tests
    from app.models.tenant import Tenant
    tenant = Tenant(name="TestTenant")
    session.add(tenant)
    session.commit()
    session.refresh(tenant)
    
    # Store tenant_id for fixtures to use
    session._test_tenant_id = tenant.id

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Return a TestClient that uses the test database."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    limiter.enabled = False  # Disable rate limiting for tests
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client, db_session):
    """Register a user and return valid auth headers."""
    # Register
    client.post("/api/auth/register", json={
        "email": "integration@test.com",
        "password": "Secure@pass1",
        "password_confirm": "Secure@pass1",
        "name": "Integration User",
        "tenant_name": "TestTenant"
    })
    # Login
    res = client.post("/api/auth/login", data={
        "username": "integration@test.com",
        "password": "Secure@pass1",
    })
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_profile_data(db_session):
    """Return a sample user profile dict (uncommitted)."""
    return {
        "name": "Test User",
        "education": "bachelor",
        "years_experience": 3,
        "skills": ["Python", "SQL", "Pandas", "Docker", "AWS"],
        "resume_text": None,
        "is_career_switcher": True,
        # tenant_id handled by endpoint or service
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
