"""Upskilling roadmap generator — maps missing skills to SCTP courses."""

from sqlalchemy.orm import Session

from app.models.sctp_course import SCTPCourse
from app.models.user_profile import UserProfile
from app.schemas.skill_gap import RoadmapItem
from app.services.gap_analyzer import analyze_gaps
from app.services.subsidy_calculator import calculate_subsidies


def generate_roadmap(profile: UserProfile, db: Session) -> list[RoadmapItem]:
    gaps = analyze_gaps(profile, db)
    courses = db.query(SCTPCourse).all()

    is_career_switcher = profile.is_career_switcher or False

    # Collect all missing/partial skills across recommended roles, deduped
    skill_priorities: dict[str, int] = {}
    for role_gap in gaps:
        for gap_item in role_gap.gaps:
            if gap_item.gap_severity in ("high", "medium"):
                if gap_item.skill not in skill_priorities:
                    skill_priorities[gap_item.skill] = gap_item.priority
                else:
                    skill_priorities[gap_item.skill] = min(
                        skill_priorities[gap_item.skill], gap_item.priority
                    )

    # Sort skills by priority
    sorted_skills = sorted(skill_priorities.items(), key=lambda x: x[1])

    # Map skills to courses
    roadmap = []
    current_week = 1
    used_courses = set()

    for skill, priority in sorted_skills:
        # Find best course for this skill
        best_course = None
        best_match_count = 0
        for course in courses:
            if course.id in used_courses:
                continue
            taught = [s.lower() for s in course.skills_taught]
            if skill.lower() in taught:
                # Prefer courses that cover multiple gap skills
                match_count = sum(
                    1 for s, _ in sorted_skills
                    if s.lower() in taught
                )
                if match_count > best_match_count:
                    best_match_count = match_count
                    best_course = course

        if best_course:
            used_courses.add(best_course.id)
            week_end = current_week + best_course.duration_weeks - 1

            # Calculate real subsidies
            subsidies = calculate_subsidies(best_course, is_career_switcher)

            roadmap.append(RoadmapItem(
                skill=skill,
                course_title=best_course.title,
                provider=best_course.provider,
                duration_weeks=best_course.duration_weeks,
                level=best_course.level,
                url=best_course.url,
                certification=best_course.certification,
                priority=priority,
                week_start=current_week,
                week_end=week_end,
                skillsfuture_eligible=best_course.skillsfuture_eligible or True,
                skillsfuture_credit_amount=subsidies["sfc_applicable"],
                course_fee=subsidies["course_fee"],
                nett_fee_after_subsidy=subsidies["nett_payable"],
            ))
            current_week = week_end + 1

    return roadmap
