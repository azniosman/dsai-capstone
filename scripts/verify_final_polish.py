import requests
import json
import sys

BASE_URL = "http://localhost:8000/api"

def test_market_simulation():
    print("\n--- Testing Market Simulation ---")
    try:
        # Note: This endpoint might require auth headers if strict, but let's try without first 
        # as the router uses `Depends(get_current_tenant)` which might auto-resolve for dev or fail.
        # If it fails, we need to mock auth or use a token. 
        # Actually, `get_current_tenant` usually expects an API key or JWT.
        # Let's assume we need to skip auth for this test or use a valid setup. 
        # For locally running dev server, we might need a token.
        # However, for the sake of this script, let's just try to hit it and see response code.
        response = requests.post(f"{BASE_URL}/market/simulate")
        if response.status_code in [200, 401, 403]:
             print(f"Endpoint reachable. Status: {response.status_code}")
             if response.status_code == 200:
                 print("Simulation success:", response.json())
        else:
             print(f"Failed. Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_pathways():
    print("\n--- Testing SCTP Pathways ---")
    payload = {
        "skills_needed": ["Python", "Data Analysis", "Unknown Skill"]
    }
    try:
        response = requests.post(f"{BASE_URL}/courses/pathways", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"Success. Received {len(data)} pathways.")
            for p in data:
                print(f"Skill: {p['skill']}, Courses: {len(p['courses'])}")
        elif response.status_code in [401, 403]:
             print(f"Endpoint reachable but requires auth. Status: {response.status_code}")
        else:
            print(f"Failed. Status: {response.status_code}, Body: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_market_simulation()
    test_pathways()
