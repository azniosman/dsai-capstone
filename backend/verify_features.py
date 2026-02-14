
import httpx as requests
import json
import time

BASE_URL = "http://localhost:8000/api"

def test_health():
    try:
        # Health is at root /health, not /api/health
        res = requests.get("http://localhost:8000/health")
        print(f"Health Check: {res.status_code} {res.json()}")
    except Exception as e:
        print(f"Health Check Failed: {e}")

def test_resume_rewriter(token):
    print("\nTesting Resume Rewriter...")
    payload = {
        "bullet_point": "Fixed bugs in the system",
        "target_role": "Software Engineer"
    }
    headers = {"Authorization": f"Bearer {token}"}
    try:
        res = requests.post(f"{BASE_URL}/resume/rewrite", json=payload, headers=headers)
        if res.status_code == 200:
            print("Success:", json.dumps(res.json(), indent=2))
        else:
            print("Failed:", res.status_code, res.text)
    except Exception as e:
        print(f"Rewriter Failed: {e}")

def test_project_suggestions(token):
    print("\nTesting Project Suggestions (Profile 1)...")
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Ensure profile exists (idempotent-ish)
        requests.post(f"{BASE_URL}/profile", json={"name": "Test User", "skills": ["Python", "SQL"]}, headers=headers)
        
        # Get profile ID
        me = requests.get(f"{BASE_URL}/profile/me", headers=headers).json()
        profile_id = me["id"]
        
        # Get suggestions
        res = requests.get(f"{BASE_URL}/project-suggestions/{profile_id}", headers=headers)
        print(f"Project Suggestions Status: {res.status_code}")
        if res.status_code == 200:
            data = res.json()
            print(f"Got {len(data.get('suggestions', []))} suggestions.")
            print("Sample:", data.get('suggestions', [])[0]['title'] if data.get('suggestions') else "None")
        else:
            print("Failed:", res.text)
    except Exception as e:
        print(f"Project Test Failed: {e}")

if __name__ == "__main__":
    test_health()
    
    # Auth flow
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": "testuser@example.com", "password": "Password123!"})
        if login_res.status_code != 200:
            requests.post(f"{BASE_URL}/auth/register", json={"email": "testuser@example.com", "password": "Password123!", "tenant_name": "TestTenant", "name": "Test User", "password_confirm": "Password123!"})
            login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": "testuser@example.com", "password": "Password123!"})
        
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            test_resume_rewriter(token)
            test_project_suggestions(token)
        else:
            print("Login failed.")
    except Exception as e:
        print(f"Auth Failed: {e}")
