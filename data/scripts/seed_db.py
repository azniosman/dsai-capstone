"""Load seed data from JSON files into PostgreSQL."""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "backend"))

from app.database import engine, SessionLocal, Base
from app.models import JobRole, Skill, SCTPCourse, MarketInsight

SEED_DIR = os.path.join(os.path.dirname(__file__), "..", "seed")


def load_json(filename):
    with open(os.path.join(SEED_DIR, filename)) as f:
        return json.load(f)


def seed_skills(db):
    data = load_json("skills_taxonomy.json")
    count = 0
    for category in data["categories"]:
        for skill_name in category["skills"]:
            existing = db.query(Skill).filter_by(name=skill_name).first()
            if not existing:
                db.add(Skill(name=skill_name, category=category["name"]))
                count += 1
    db.commit()
    print(f"  Seeded {count} skills")


def seed_job_roles(db):
    data = load_json("job_roles.json")
    count = 0
    for role in data["roles"]:
        existing = db.query(JobRole).filter_by(title=role["title"]).first()
        if not existing:
            db.add(JobRole(
                title=role["title"],
                category=role["category"],
                description=role["description"],
                required_skills=role["required_skills"],
                preferred_skills=role["preferred_skills"],
                min_experience_years=role["min_experience_years"],
                education_level=role["education_level"],
                career_switcher_friendly=role["career_switcher_friendly"],
                salary_range=role.get("salary_range"),
            ))
            count += 1
    db.commit()
    print(f"  Seeded {count} job roles")


def seed_courses(db):
    data = load_json("sctp_courses.json")
    count = 0
    for course in data["courses"]:
        existing = db.query(SCTPCourse).filter_by(title=course["title"]).first()
        if not existing:
            db.add(SCTPCourse(
                title=course["title"],
                provider=course["provider"],
                skills_taught=course["skills_taught"],
                duration_weeks=course["duration_weeks"],
                level=course["level"],
                url=course.get("url"),
                certification=course.get("certification"),
                skillsfuture_eligible=course.get("skillsfuture_eligible", True),
                skillsfuture_credit_amount=course.get("skillsfuture_credit_amount", 500.0),
                course_fee=course.get("course_fee", 2000.0),
                nett_fee_after_subsidy=course.get("nett_fee_after_subsidy", 500.0),
            ))
            count += 1
    db.commit()
    print(f"  Seeded {count} courses")


def seed_market_insights(db):
    from app.routers.market import DEFAULT_INSIGHTS
    count = 0
    for insight in DEFAULT_INSIGHTS:
        existing = db.query(MarketInsight).filter_by(role_category=insight["role_category"]).first()
        if not existing:
            db.add(MarketInsight(**insight))
            count += 1
    db.commit()
    print(f"  Seeded {count} market insights")


def main():
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Seeding skills...")
        seed_skills(db)
        print("Seeding job roles...")
        seed_job_roles(db)
        print("Seeding SCTP courses...")
        seed_courses(db)
        print("Seeding market insights...")
        seed_market_insights(db)
        print("Done!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
