"""Tests for authentication endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.limiter import limiter


# --- Test DB setup (single connection shared across threads) ---
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSession = sessionmaker(bind=engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
# Disable rate limiting in tests
limiter.enabled = False

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    """Recreate all tables before each test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    # Clear in-memory token blacklist
    from app.auth import _revoked_tokens
    _revoked_tokens.clear()
    yield


def _register(email="test@example.com", password="securepass123", name="Test User"):
    return client.post("/api/auth/register", json={
        "email": email,
        "password": password,
        "password_confirm": password,
        "name": name,
    })


def _login(email="test@example.com", password="securepass123"):
    return client.post("/api/auth/login", data={
        "username": email,
        "password": password,
    })


# ---------- Registration ----------

def test_register_success():
    res = _register()
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert "id" in data


def test_register_password_too_short():
    res = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "short",
        "password_confirm": "short",
        "name": "Test",
    })
    assert res.status_code == 422


def test_register_password_mismatch():
    res = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepass123",
        "password_confirm": "differentpass",
        "name": "Test",
    })
    assert res.status_code == 422


def test_register_invalid_email():
    res = client.post("/api/auth/register", json={
        "email": "not-an-email",
        "password": "securepass123",
        "password_confirm": "securepass123",
        "name": "Test",
    })
    assert res.status_code == 422


def test_register_duplicate_email():
    _register()
    res = _register()
    assert res.status_code == 400
    # Generic message to prevent email enumeration
    assert "try again" in res.json()["detail"].lower()


# ---------- Login ----------

def test_login_success():
    _register()
    res = _login()
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password():
    _register()
    res = _login(password="wrongpassword")
    assert res.status_code == 401


def test_login_inactive_user():
    _register()
    # Directly deactivate the user
    db = TestSession()
    from app.models.user import User
    user = db.query(User).first()
    user.is_active = False
    db.commit()
    db.close()

    res = _login()
    assert res.status_code == 403


def test_account_lockout():
    _register()
    # Fail 5 times
    for _ in range(5):
        res = _login(password="wrongpassword")
        assert res.status_code == 401

    # 6th attempt should be locked
    res = _login(password="wrongpassword")
    assert res.status_code == 429
    assert "locked" in res.json()["detail"].lower()


def test_failed_attempts_reset_on_success():
    _register()
    # Fail 3 times (below threshold)
    for _ in range(3):
        _login(password="wrongpassword")

    # Successful login resets counter
    res = _login()
    assert res.status_code == 200

    # Should be able to fail 5 more times before lockout
    for _ in range(4):
        _login(password="wrongpassword")
    # 5th failure should still work (not locked)
    res = _login(password="wrongpassword")
    assert res.status_code == 401  # Not 429


# ---------- Token refresh ----------

def test_refresh_token_success():
    _register()
    login_res = _login()
    refresh_token = login_res.json()["refresh_token"]

    res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data
    # New tokens should be different
    assert data["refresh_token"] != refresh_token


def test_refresh_token_reuse_blocked():
    _register()
    login_res = _login()
    refresh_token = login_res.json()["refresh_token"]

    # First refresh succeeds
    res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 200

    # Reusing old refresh token should fail (it was revoked)
    res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 401


# ---------- Protected endpoints ----------

def test_protected_endpoint_no_token():
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_protected_endpoint_valid_token():
    _register()
    login_res = _login()
    token = login_res.json()["access_token"]

    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "test@example.com"


# ---------- Password change ----------

def test_change_password():
    _register()
    login_res = _login()
    token = login_res.json()["access_token"]

    # Change password
    res = client.post("/api/auth/change-password", json={
        "current_password": "securepass123",
        "new_password": "newsecurepass456",
    }, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200

    # Login with new password
    res = _login(password="newsecurepass456")
    assert res.status_code == 200

    # Old password should fail
    res = _login(password="securepass123")
    assert res.status_code == 401


# ---------- Logout ----------

def test_logout_revokes_refresh_token():
    _register()
    login_res = _login()
    refresh_token = login_res.json()["refresh_token"]

    # Logout
    res = client.post("/api/auth/logout", json={"refresh_token": refresh_token})
    assert res.status_code == 200

    # Refresh should now fail
    res = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert res.status_code == 401
