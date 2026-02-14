
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import User, UserProfile
from app.database import SessionLocal
from app.auth import create_access_token

client = TestClient(app)

@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_dashboard_summary_endpoint(db_session):
    # 1. Get a test user (ensure one exists or create one)
    # Use the known user from full_test.py which has a profile
    user = db_session.query(User).filter(User.email == "fulltest_1771092514@test.com").first()
    if not user:
        # Fallback to any user with profile
        user = db_session.query(User).join(UserProfile).first()
        
    if not user:
        pytest.skip("No test user found in DB")
    
    # Ensure profile exists
    profile = db_session.query(UserProfile).filter(UserProfile.user_id == user.id).first()
    if not profile:
        # Create a dummy profile if needed, but preferably rely on existing data
        pytest.skip("No profile found for test user")

    # 2. Login to get token
    # get_current_user expects 'sub' to be the user_id (int)
    token = create_access_token(
        data={"sub": str(user.id)},
        tenant_id=user.tenant_id
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Call Dashboard Summary
    response = client.get("/api/dashboard/summary", headers=headers)
    
    # 4. Assertions
    assert response.status_code == 200, f"Response: {response.text}"
    data = response.json()
    
    # Check schema
    assert "career_readiness" in data
    assert "recommendations_count" in data
    assert "gaps_identified" in data
    assert isinstance(data["skills"], list)
    
    # Check logic (readiness should be 0-100)
    assert 0 <= data["career_readiness"] <= 100
    print(f"\nDashboard Summary: {data}")

if __name__ == "__main__":
    # Manually run if executed as script
    try:
        test_dashboard_summary_endpoint(SessionLocal())
        print("✅ Dashboard Summary Test Passed")
    except Exception as e:
        print(f"❌ Test Failed: {e}")
