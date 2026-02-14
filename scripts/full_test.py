"""Full integration test for all SkillBridge AI endpoints."""
import requests
import json
import sys
import time
import io

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0
WARN = 0

def report(name, ok, msg=""):
    global PASS, FAIL, WARN
    if ok == True:
        PASS += 1
        print(f"  ✅ {name}")
    elif ok == "warn":
        WARN += 1
        print(f"  ⚠️  {name}: {msg}")
    else:
        FAIL += 1
        print(f"  ❌ {name}: {msg}")

def safe_get(url, **kw):
    try:
        return requests.get(f"{BASE}{url}", timeout=30, **kw)
    except Exception as e:
        return type('R', (), {'status_code': 0, 'text': str(e)[:200], 'json': lambda: {}})()

def safe_post(url, data=None, **kw):
    try:
        return requests.post(f"{BASE}{url}", json=data, timeout=60, **kw)
    except Exception as e:
        return type('R', (), {'status_code': 0, 'text': str(e)[:200], 'json': lambda: {}})()

# ──────────────────────────────────────────────
# 1. Health
# ──────────────────────────────────────────────
def test_health():
    print("\n── 1. Health ──")
    r = safe_get("/health")
    report("GET /health", r.status_code == 200)

# ──────────────────────────────────────────────
# 2. Auth (Register + Login)
# ──────────────────────────────────────────────
TOKEN = None
def test_auth():
    global TOKEN
    print("\n── 2. Auth ──")
    ts = int(time.time())
    email = f"fulltest_{ts}@test.com"
    password = "TestPass1234!"

    # Register (with password_confirm)
    r = safe_post("/api/auth/register", {
        "email": email,
        "password": password,
        "password_confirm": password,
        "name": f"TestUser{ts}",
        "tenant_name": "Global"
    })
    report("POST /api/auth/register", r.status_code in (200, 201),
           f"{r.status_code}: {r.text[:120]}" if r.status_code not in (200, 201) else "")

    # Login (form-encoded)
    try:
        r = requests.post(f"{BASE}/api/auth/login",
                          data={"username": email, "password": password},
                          headers={"Content-Type": "application/x-www-form-urlencoded"},
                          timeout=10)
        if r.status_code == 200:
            TOKEN = r.json().get("access_token")
            report("POST /api/auth/login", True)
        else:
            report("POST /api/auth/login", False, f"{r.status_code}: {r.text[:120]}")
    except Exception as e:
        report("POST /api/auth/login", False, str(e)[:100])

def auth_headers():
    return {"Authorization": f"Bearer {TOKEN}"} if TOKEN else {}

# ──────────────────────────────────────────────
# 3. Profile
# ──────────────────────────────────────────────
PROFILE_ID = None
def test_profile():
    global PROFILE_ID
    print("\n── 3. Profile ──")
    payload = {
        "name": "Integration Test",
        "education": "Bachelor's in CS",
        "years_experience": 3,
        "age": 28,
        "skills": ["Python", "SQL", "React"],
        "resume_text": "Experienced Python developer with 3 years building data pipelines using Spark and SQL. Proficient in React and Node.js for full-stack development. Managed Docker and Kubernetes deployments on AWS.",
        "is_career_switcher": False
    }
    # Create profile WITH auth so it's linked to the authenticated tenant
    headers = auth_headers()
    r = safe_post("/api/profile", payload, headers=headers) if TOKEN else safe_post("/api/profile", payload)
    if r.status_code == 200:
        data = r.json()
        PROFILE_ID = data.get("id")
        skills = data.get("skills", [])
        report("POST /api/profile (create)", True)
        report(f"  Skills extracted: {len(skills)} skills", len(skills) > 0,
               "No skills extracted from resume!" if len(skills) == 0 else "")
        if skills:
            print(f"    → Skills: {', '.join(skills[:10])}{'...' if len(skills) > 10 else ''}")
    else:
        report("POST /api/profile (create)", False, f"{r.status_code}: {r.text[:150]}")

    # GET profile/me
    if TOKEN:
        r = requests.get(f"{BASE}/api/profile/me", headers=auth_headers(), timeout=10)
        report("GET /api/profile/me", r.status_code in (200, 404),
               f"{r.status_code}" if r.status_code not in (200, 404) else "")

# ──────────────────────────────────────────────
# 4. Recommendations (POST /api/recommend)
# ──────────────────────────────────────────────
def test_recommendations():
    print("\n── 4. Recommendations ──")
    if not PROFILE_ID:
        report("POST /api/recommend", "warn", "No profile ID")
        return
    r = safe_post("/api/recommend", {"profile_id": PROFILE_ID}, headers=auth_headers())
    if r.status_code == 200:
        data = r.json()
        count = len(data.get("recommendations", []))
        report(f"POST /api/recommend ({count} recs)", count > 0,
               "No recommendations returned" if count == 0 else "")
        if count > 0:
            top = data["recommendations"][0]
            print(f"    → Top: {top.get('title', 'N/A')} (score: {top.get('match_score', 'N/A')})")
    else:
        report("POST /api/recommend", False, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# 5. Skill Gap
# ──────────────────────────────────────────────
def test_skill_gap():
    print("\n── 5. Skill Gap ──")
    if not PROFILE_ID:
        report("GET /api/skill-gap/{id}", "warn", "No profile ID")
        return
    r = safe_get(f"/api/skill-gap/{PROFILE_ID}", headers=auth_headers())
    if r.status_code == 200:
        data = r.json()
        gaps = data if isinstance(data, list) else data.get("gaps", [])
        report(f"GET /api/skill-gap ({len(gaps)} role gaps)", True)
    else:
        report("GET /api/skill-gap", False, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# 6. Market Insights
# ──────────────────────────────────────────────
def test_market():
    print("\n── 6. Market Insights ──")
    r = safe_get("/api/market-insights", headers=auth_headers())
    if r.status_code == 200:
        data = r.json()
        insights = data.get("insights", [])
        report(f"GET /api/market-insights ({len(insights)} categories)", len(insights) > 0)
        has_forecast = any(i.get("forecast_2026") for i in insights)
        report("  2026 Trends present", has_forecast or "warn",
               "forecast_2026 field empty — seed data has no DB forecast yet" if not has_forecast else "")
        for i in insights[:2]:
            f = i.get('forecast_2026', 'N/A')
            print(f"    → {i['role_category']}: SGD {i['avg_salary_sgd']}/mo, {i['yoy_growth_pct']}% YoY, 2026: {f}")
    else:
        report("GET /api/market-insights", False, f"{r.status_code}: {r.text[:120]}")

    # Simulate
    r = safe_post("/api/simulate", headers=auth_headers())
    report("POST /api/simulate", r.status_code == 200, f"{r.status_code}: {r.text[:120]}" if r.status_code != 200 else "")

# ──────────────────────────────────────────────
# 7. Courses & Subsidies
# ──────────────────────────────────────────────
def test_courses():
    print("\n── 7. Courses & Subsidies ──")
    r = safe_get("/api/courses", headers=auth_headers())
    if r.status_code == 200:
        data = r.json()
        courses = data.get("courses", [])
        report(f"GET /api/courses ({len(courses)} courses)", len(courses) > 0,
               "No courses in DB" if len(courses) == 0 else "")
        if courses:
            c = courses[0]
            print(f"    → {c['title']}: Fee=${c['course_fee']}, Subsidy=-${c['subsidy_amount']}, Pay=${c['nett_payable']}")
            report("  Subsidy calculator works", c['nett_payable'] <= c['course_fee'])
    else:
        report("GET /api/courses", False, f"{r.status_code}: {r.text[:120]}")

    # Pathways
    r = safe_post("/api/pathways", {"skills_needed": ["Python", "Docker"]}, headers=auth_headers())
    if r.status_code == 200:
        pathways = r.json()
        report(f"POST /api/pathways ({len(pathways)} pathways)", True)
    else:
        report("POST /api/pathways", r.status_code == 200, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# 8. Resume Upload
# ──────────────────────────────────────────────
def test_upload():
    print("\n── 8. Resume Upload ──")
    content = b"Experienced Python developer. Skills: Python, SQL, Docker, Kubernetes, React, TensorFlow, AWS, PostgreSQL."
    files = {"file": ("test_resume.txt", io.BytesIO(content), "text/plain")}
    try:
        r = requests.post(f"{BASE}/api/upload-resume", files=files, timeout=30)
        if r.status_code == 200:
            data = r.json()
            skills = data.get("skills", [])
            report(f"POST /api/upload-resume ({len(skills)} skills)", len(skills) > 0,
                   "0 skills extracted" if len(skills) == 0 else "")
            if skills:
                print(f"    → Skills: {', '.join(skills[:8])}")
        else:
            report("POST /api/upload-resume", False, f"{r.status_code}: {r.text[:120]}")
    except Exception as e:
        report("POST /api/upload-resume", False, str(e)[:100])

# ──────────────────────────────────────────────
# 9. AI Chat
# ──────────────────────────────────────────────
def test_chat():
    print("\n── 9. AI Chat ──")
    r = safe_post("/api/chat", {
        "profile_id": PROFILE_ID,
        "messages": [{"role": "user", "content": "What high-growth roles match my Python and SQL skills?"}]
    })
    if r.status_code == 200:
        reply = r.json().get("reply", "")
        report("POST /api/chat", len(reply) > 10, "Reply too short" if len(reply) <= 10 else "")
        print(f"    → Reply: {reply[:150]}...")
    else:
        report("POST /api/chat", False, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# 10. Mock Interview
# ──────────────────────────────────────────────
def test_interview():
    print("\n── 10. Mock Interview ──")
    r = safe_post("/api/interview", {
        "profile_id": PROFILE_ID,
        "role_title": "Data Engineer",
        "messages": [],
        "difficulty": "intermediate"
    })
    if r.status_code == 200:
        data = r.json()
        report("POST /api/interview (start)", bool(data.get("reply")))
        print(f"    → Q{data.get('question_number', '?')}: {data.get('reply', '')[:120]}...")
    else:
        report("POST /api/interview", False, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# 11. Resume Rewriter
# ──────────────────────────────────────────────
def test_resume_rewriter():
    print("\n── 11. Resume Rewriter ──")
    r = safe_post("/api/resume/rewrite", {
        "target_role": "Data Engineer",
        "bullet_point": "Fixed bugs in the data pipeline"
    }, headers=auth_headers())
    if r.status_code == 200:
        data = r.json()
        report("POST /api/resume/rewrite", bool(data.get("rewritten")))
        print(f"    → Original:  {data.get('original', 'N/A')}")
        print(f"    → Rewritten: {data.get('rewritten', 'N/A')[:150]}")
    else:
        report("POST /api/resume/rewrite", False, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# 12. Project Suggestions
# ──────────────────────────────────────────────
def test_projects():
    print("\n── 12. Project Suggestions ──")
    if not PROFILE_ID:
        report("GET /api/project-suggestions/{id}", "warn", "No profile ID")
        return
    r = safe_get(f"/api/project-suggestions/{PROFILE_ID}", headers=auth_headers())
    if r.status_code == 200:
        data = r.json()
        count = len(data.get("suggestions", []))
        report(f"GET /api/project-suggestions ({count} projects)", count > 0,
               "No suggestions" if count == 0 else "")
    else:
        report("GET /api/project-suggestions", False, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# 13. Roles
# ──────────────────────────────────────────────
def test_roles():
    print("\n── 13. Roles ──")
    r = safe_get("/api/roles", headers=auth_headers())
    if r.status_code == 200:
        roles = r.json()
        report(f"GET /api/roles ({len(roles)} roles)", len(roles) > 0)
    else:
        report("GET /api/roles", False, f"{r.status_code}: {r.text[:120]}")

# ──────────────────────────────────────────────
# RUN ALL
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  SkillBridge AI — Full Integration Test")
    print("=" * 60)
    start = time.time()

    test_health()
    test_auth()
    test_profile()
    test_roles()
    test_recommendations()
    test_skill_gap()
    test_market()
    test_courses()
    test_upload()

    # AI features (these may take longer)
    print("\n  ⏳ Testing AI features (may take 30-60s)...")
    test_chat()
    test_interview()
    test_resume_rewriter()
    test_projects()

    elapsed = time.time() - start
    print("\n" + "=" * 60)
    print(f"  Results: ✅ {PASS} passed  |  ❌ {FAIL} failed  |  ⚠️  {WARN} warnings")
    print(f"  Time: {elapsed:.1f}s")
    print("=" * 60)

    sys.exit(1 if FAIL > 0 else 0)
