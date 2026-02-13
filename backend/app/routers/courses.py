from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_tenant
from app.database import get_db
from app.models.sctp_course import SCTPCourse
from app.models.tenant import Tenant
from app.services.subsidy_calculator import calculate_subsidies

router = APIRouter(tags=["courses"])


class CourseItem(BaseModel):
    id: int
    title: str
    provider: str
    skills_taught: list[str]
    duration_weeks: int | None
    level: str
    url: str | None
    certification: str | None
    course_fee: float
    subsidy_percent: float
    mces_eligible: bool
    # Computed subsidy fields
    subsidy_amount: float
    nett_payable: float
    sfc_applicable: float

    model_config = {"from_attributes": True}


class CourseListResponse(BaseModel):
    courses: list[CourseItem]
    total_courses: int


class SubsidyRequest(BaseModel):
    course_id: int
    is_career_switcher: bool = False


class SubsidyResponse(BaseModel):
    course_fee: float
    subsidy_percent: float
    subsidy_amount: float
    mces_applied: bool
    sfc_applicable: float
    nett_payable: float


@router.get("/courses", response_model=CourseListResponse)
def list_courses(
    skill: str | None = None,
    provider: str | None = None,
    level: str | None = None,
    mces_eligible: bool | None = None,
    db: Session = Depends(get_db),
    tenant: Tenant = Depends(get_current_tenant),
):
    query = db.query(SCTPCourse).filter(
        (SCTPCourse.tenant_id == tenant.id) | (SCTPCourse.tenant_id == None)
    )

    if provider:
        query = query.filter(SCTPCourse.provider == provider)
    if level:
        query = query.filter(SCTPCourse.level == level)
    if mces_eligible is not None:
        query = query.filter(SCTPCourse.mces_eligible == mces_eligible)

    courses = query.all()

    # Filter by skill (JSON array contains)
    if skill:
        skill_lower = skill.lower()
        courses = [c for c in courses if any(skill_lower in s.lower() for s in (c.skills_taught or []))]

    items = []
    for c in courses:
        sub = calculate_subsidies(c)
        items.append(CourseItem(
            id=c.id,
            title=c.title,
            provider=c.provider,
            skills_taught=c.skills_taught or [],
            duration_weeks=c.duration_weeks,
            level=c.level or "intermediate",
            url=c.url,
            certification=c.certification,
            course_fee=c.course_fee or 0,
            subsidy_percent=c.subsidy_percent or 70,
            mces_eligible=c.mces_eligible or False,
            subsidy_amount=sub["subsidy_amount"],
            nett_payable=sub["nett_payable"],
            sfc_applicable=sub["sfc_applicable"],
        ))

    return CourseListResponse(courses=items, total_courses=len(items))


@router.post("/calculate-subsidy", response_model=SubsidyResponse)
def calculate_course_subsidy(payload: SubsidyRequest, db: Session = Depends(get_db), tenant: Tenant = Depends(get_current_tenant)):
    course = db.query(SCTPCourse).filter(
        SCTPCourse.id == payload.course_id,
        (SCTPCourse.tenant_id == tenant.id) | (SCTPCourse.tenant_id == None)
    ).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    result = calculate_subsidies(course, is_career_switcher=payload.is_career_switcher)
    return SubsidyResponse(**result)

