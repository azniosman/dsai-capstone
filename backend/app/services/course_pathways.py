from sqlalchemy.orm import Session
from app.models.sctp_course import SCTPCourse

def generate_learning_pathways(skills_needed: list[str], db: Session, tenant_id: int | None = None) -> list[dict]:
    """
    Generates structured learning pathways for missing skills.
    Groups courses by skill and sorts by level (Beginner -> Intermediate -> Advanced).
    """
    pathways = []
    
    # 1. Fetch all courses
    query = db.query(SCTPCourse)
    if tenant_id:
        query = query.filter((SCTPCourse.tenant_id == tenant_id) | (SCTPCourse.tenant_id == None))
    all_courses = query.all()

    # 2. For each missing skill, find relevant courses
    for skill in skills_needed:
        relevant_courses = []
        skill_lower = skill.lower()
        
        for course in all_courses:
            # Check if skill is in course.skills_taught
            if course.skills_taught and any(skill_lower in s.lower() for s in course.skills_taught):
                relevant_courses.append(course)
        
        if not relevant_courses:
            continue

        # 3. Sort courses by level
        # Define level weights
        level_map = {
            "beginner": 1,
            "intermediate": 2,
            "advanced": 3,
            "specialist": 4
        }
        
        # Sort: 1. Level (asc), 2. Fee (asc)
        sorted_courses = sorted(
            relevant_courses, 
            key=lambda c: (
                level_map.get(c.level.lower(), 2) if c.level else 2, 
                c.course_fee or 0
            )
        )

        # 4. format output
        pathway_items = []
        for c in sorted_courses:
            pathway_items.append({
                "id": c.id,
                "title": c.title,
                "provider": c.provider,
                "level": c.level,
                "duration_weeks": c.duration_weeks,
                "course_fee": c.course_fee,
                "subsidy_percent": c.subsidy_percent
            })

        pathways.append({
            "skill": skill,
            "courses": pathway_items
        })
    
    return pathways
