
import httpx as requests
import json

BASE_URL = "http://localhost:8000/api"

def debug_profile_creation():
    print("\nDebugging Profile Creation...")
    
    # 1. Login
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": "testuser@example.com", "password": "Password123!"})
        if login_res.status_code != 200:
            requests.post(f"{BASE_URL}/auth/register", json={
                "email": "testuser@example.com", 
                "password": "Password123!", 
                "tenant_name": "TestTenant", 
                "name": "Test User", 
                "password_confirm": "Password123!"
            })
            login_res = requests.post(f"{BASE_URL}/auth/login", data={"username": "testuser@example.com", "password": "Password123!"})
        
        if login_res.status_code == 200:
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # ... (auth tests) ...

        else:
            print("Login failed.")
            
        # 4. Try unauthenticated
        print("\nTesting Unauthenticated Profile Creation...")
        payload_unauth = {
            "name": "Anonymous User",
            "education": "diploma",
            "years_experience": 2,
            "skills": ["Java"],
            "age": None
        }
        res = requests.post(f"{BASE_URL}/profile", json=payload_unauth)
        print(f"Status (Unauth): {res.status_code}")
        print("Response (Unauth):", res.text)
        
    except Exception as e:
        print(f"Debug Failed: {e}")

if __name__ == "__main__":
    debug_profile_creation()
