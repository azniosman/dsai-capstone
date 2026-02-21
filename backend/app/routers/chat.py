"""LLM career coach chatbot endpoint — SkillBridge AI persona."""

import logging

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user_optional
from app.config import settings
from app.database import get_db


router = APIRouter(tags=["chat"])




class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    profile_id: Optional[int] = None
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
    engine: Optional[str] = "SkillBridge Knowledge Engine"


def _build_market_insights_table(insights: Optional[List] = None) -> str:
    """Format market insights as a ranked table sorted by YoY growth."""
    if not insights:
        return ""
    data_list = []
    for item in insights:
        if hasattr(item, "role_category"):
            data_list.append({
                "role_category": item.role_category,
                "yoy_growth_pct": item.yoy_growth_pct,
                "avg_salary_sgd": item.avg_salary_sgd,
                "demand_level": item.demand_level
            })
        else:
            data_list.append(item)

    sorted_insights = sorted(data_list, key=lambda x: x["yoy_growth_pct"], reverse=True)
    rows = []
    for ins in sorted_insights:
        rows.append(
            f"  - {ins['role_category']}: {ins['yoy_growth_pct']}% YoY growth, "
            f"avg SGD {ins['avg_salary_sgd']:,.0f}, demand: {ins['demand_level']}"
        )
    return "--- 2026 Singapore Market Insights (sorted by growth) ---\n" + "\n".join(rows)


def _build_system_prompt(profile, recommendations=None, skill_gaps=None, roadmap_courses=None, market_insights=None, pathways=None):
    parts = [
        "You are 'SkillBridge AI,' a Senior Career Advisor specialising in the Singapore Labor Market.",
        "You have deep knowledge of the SSG Skills Framework, MySkillsFuture portal, and SCTP initiatives.",
        "",
        "Your Voice: Professional, encouraging, yet data-driven. Use localised terms like",
        "'SFC' (SkillsFuture Credit), 'MCES', 'MOM salary benchmarks', and 'SCTP.'",
        "",
        "Your Task:",
        "1. Analyse the user's current Profile JSON (provided in context).",
        "2. When asked for advice, prioritise roles with 'High Growth' labels from the Market Insights.",
        "3. If a user is over 40, always mention the $4,000 credit top-up and the Training Allowance eligibility.",
        "4. Keep responses concise. Focus on actionable steps (e.g., 'Apply for the NUS-ISS SCTP in Data Science').",
        "",
        "Response guidelines:",
        "1. Start with a brief acknowledgement of the user's situation",
        "2. Provide specific, personalised advice referencing their profile data",
        "3. End with 1-2 concrete next steps they can take today",
        "",
        _build_market_insights_table(market_insights),
    ]

    if profile:
        parts.append(f"\n--- User Profile ---")
        parts.append(f"Name: {profile.name}")
        parts.append(f"Education: {profile.education}")
        parts.append(f"Experience: {profile.years_experience} years")
        if profile.age:
            parts.append(f"Age: {profile.age}")
        parts.append(f"Skills: {', '.join(profile.skills) if profile.skills else 'Not specified'}")
        parts.append(f"Career Switcher: {'Yes' if profile.is_career_switcher else 'No'}")

        # MCES eligibility context for users aged 40+
        is_over_40 = (profile.age and profile.age >= 40) or (profile.years_experience >= 15)
        if is_over_40:
            parts.append("\n--- MCES Eligibility (User aged 40+) ---")
            parts.append("ALWAYS mention these benefits:")
            parts.append("- Mid-Career Enhanced Subsidy (MCES): up to 90% course fee subsidy")
            parts.append("- $4,000 SkillsFuture Credit top-up for Singaporeans aged 40-60")
            parts.append("- Training Allowance of up to $6,000 during SCTP enrolment")

    if recommendations:
        rec_text = "\n".join(
            f"  - {r.title} ({round(r.match_score*100)}% match, quality: {r.skill_match_quality})"
            for r in recommendations[:3]
        )
        parts.append(f"\n--- Top Recommended Roles ---\n{rec_text}")
    if skill_gaps:
        gap_skills = []
        for role_gap in skill_gaps[:2]:
            for g in role_gap.gaps:
                if g.gap_severity in ("high", "medium") and g.skill not in gap_skills:
                    gap_skills.append(g.skill)
        if gap_skills:
            parts.append(f"\n--- Key Skill Gaps ---\n  {', '.join(gap_skills[:8])}")

    # Inject structured pathways if available, else fallback to raw roadmap
    if pathways:
        parts.append("\n--- Recommended Learning Pathways (SCTP) ---")
        for p in pathways[:3]: # Limit to top 3 skills
            parts.append(f"Skill: {p['skill']}")
            for c in p['courses'][:2]: # Limit to 2 courses per skill
                parts.append(f"  - {c['level'].title()}: {c['title']} ({c['provider']}, ${c['course_fee']})")
    elif roadmap_courses:
        course_text = "\n".join(
            f"  - {item.course_title} ({item.provider}, {item.duration_weeks}wks, nett ${item.nett_fee_after_subsidy:.0f})"
            for item in roadmap_courses[:4]
        )
        parts.append(f"\n--- Recommended Courses ---\n{course_text}")

    return "\n".join(parts)


@router.post("/chat", response_model=ChatResponse)
def career_chat(payload: ChatRequest, db: Session = Depends(get_db), user=Depends(get_current_user_optional)):
    tenant_id = user.tenant_id if user else 1  # fallback to global tenant

    profile = None
    recommendations = None
    skill_gaps = None
    roadmap_courses = None
    market_insights = None
    pathways = None

    # Load market insights (global or tenant specific)
    from app.models.market_insight import MarketInsight
    market_insights = db.query(MarketInsight).filter(
        (MarketInsight.tenant_id == tenant_id) | (MarketInsight.tenant_id == None)
    ).all()

    if payload.profile_id:
        from app.models.user_profile import UserProfile
        profile = db.query(UserProfile).filter(UserProfile.id == payload.profile_id, UserProfile.tenant_id == tenant_id).first()
        if profile:
            from app.services.recommender import get_recommendations
            from app.services.gap_analyzer import analyze_gaps
            from app.services.roadmap_generator import generate_roadmap
            from app.services.course_pathways import generate_learning_pathways

            try:
                recommendations = get_recommendations(profile, db, tenant_id=tenant_id, top_n=3)
                skill_gaps = analyze_gaps(profile, db, tenant_id=tenant_id)
                roadmap_courses = generate_roadmap(profile, db, tenant_id=tenant_id)
                
                # Extract missing skills for pathways
                missing_skills = []
                if skill_gaps:
                    for role_gap in skill_gaps[:2]:
                        for g in role_gap.gaps:
                            if g.gap_severity in ("high", "medium") and g.skill not in missing_skills:
                                missing_skills.append(g.skill)
                
                if missing_skills:
                    pathways = generate_learning_pathways(missing_skills, db, tenant_id=tenant_id)

            except Exception as e:
                logging.getLogger(__name__).exception(
                    "Chat context load failed for profile_id=%s, responding without user context: %s",
                    payload.profile_id,
                    e,
                )
                # recommendations, skill_gaps, roadmap_courses remain None

    system_prompt = _build_system_prompt(profile, recommendations, skill_gaps, roadmap_courses, market_insights, pathways)

    # Try Bedrock - fall back to Gemini - fall back to Rules
    # Note: invoke_model (blocking) is used instead of invoke_model_with_stream because
    # API Gateway + Lambda buffers the full response regardless; streaming connections
    # get cut by the 29s API GW integration timeout before the response completes.
    try:
        from app.services.bedrock_service import bedrock_service

        reply = bedrock_service.invoke_model(
            system_prompt=system_prompt,
            messages=[m.dict() for m in payload.messages]
        )

        def bedrock_stream():
            yield '[ENGINE: AWS Bedrock (Claude 3.5 Sonnet)]\n'
            yield reply

        return StreamingResponse(bedrock_stream(), media_type="text/event-stream")

    except Exception as e_bedrock:
        logging.error(f"Bedrock API error: {e_bedrock}")

        # Fallback to Gemini if configured
        if settings.gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.gemini_api_key)

                history = []
                for msg in payload.messages[:-1]:
                    role = "user" if msg.role == "user" else "model"
                    history.append({"role": role, "parts": [msg.content]})

                model = genai.GenerativeModel(
                    model_name=settings.gemini_model,
                    system_instruction=system_prompt
                )
                chat = model.start_chat(history=history)
                response = chat.send_message(payload.messages[-1].content)

                def gemini_stream():
                    yield f'[ENGINE: Google Gemini ({settings.gemini_model})]\n'
                    yield response.text

                return StreamingResponse(gemini_stream(), media_type="text/event-stream")
            except Exception as e_gemini:
                logging.error(f"Gemini API error: {e_gemini}")

        raise HTTPException(
            status_code=503,
            detail="AI service unavailable. Both Bedrock and Gemini failed. Please try again shortly."
        )
