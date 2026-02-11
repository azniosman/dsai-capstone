"""LLM career coach chatbot endpoint — WorkD AI persona."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.routers.market import DEFAULT_INSIGHTS

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    profile_id: int | None = None
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


def _build_market_insights_table() -> str:
    """Format DEFAULT_INSIGHTS as a ranked table sorted by YoY growth."""
    sorted_insights = sorted(DEFAULT_INSIGHTS, key=lambda x: x["yoy_growth_pct"], reverse=True)
    rows = []
    for ins in sorted_insights:
        rows.append(
            f"  - {ins['role_category']}: {ins['yoy_growth_pct']}% YoY growth, "
            f"avg SGD {ins['avg_salary_sgd']:,.0f}, demand: {ins['demand_level']}"
        )
    return "--- 2026 Singapore Market Insights (sorted by growth) ---\n" + "\n".join(rows)


def _build_system_prompt(profile, recommendations=None, skill_gaps=None, roadmap_courses=None):
    parts = [
        "You are 'WorkD AI,' a Senior Career Advisor specialising in the Singapore Labor Market.",
        "You have deep knowledge of the SSG Skills Framework, MySkillsFuture portal, and SCTP initiatives.",
        "",
        "Your Voice: Professional, encouraging, yet data-driven. Use localised terms like",
        "'SFC' (SkillsFuture Credit), 'MCES', 'MOM salary benchmarks', and 'SCTP.'",
        "",
        "Your Task:",
        "1. Analyse the user's current Profile JSON (provided in context).",
        "2. When asked for advice, prioritise roles with 'High Growth' labels from the 2026 Singapore Market Insights.",
        "3. If a user is over 40, always mention the $4,000 credit top-up and the Training Allowance eligibility.",
        "4. Keep responses concise. Focus on actionable steps (e.g., 'Apply for the NUS-ISS SCTP in Data Science').",
        "",
        "Response guidelines:",
        "1. Start with a brief acknowledgement of the user's situation",
        "2. Provide specific, personalised advice referencing their profile data",
        "3. End with 1-2 concrete next steps they can take today",
        "",
        _build_market_insights_table(),
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
    if roadmap_courses:
        course_text = "\n".join(
            f"  - {item.course_title} ({item.provider}, {item.duration_weeks}wks, nett ${item.nett_fee_after_subsidy:.0f})"
            for item in roadmap_courses[:4]
        )
        parts.append(f"\n--- Recommended Courses ---\n{course_text}")
    return "\n".join(parts)


@router.post("/chat", response_model=ChatResponse)
def career_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if not settings.openai_api_key:
        # Fallback: rule-based response when no API key configured
        return ChatResponse(reply=_fallback_response(
            payload.messages[-1].content if payload.messages else "",
            payload.profile_id,
            db,
        ))

    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)

    profile = None
    recommendations = None
    skill_gaps = None
    roadmap_courses = None
    if payload.profile_id:
        from app.models.user_profile import UserProfile
        profile = db.get(UserProfile, payload.profile_id)
        if profile:
            from app.services.recommender import get_recommendations
            from app.services.gap_analyzer import analyze_gaps
            from app.services.roadmap_generator import generate_roadmap
            try:
                recommendations = get_recommendations(profile, db, top_n=3)
                skill_gaps = analyze_gaps(profile, db)
                roadmap_courses = generate_roadmap(profile, db)
            except Exception:
                pass

    system_prompt = _build_system_prompt(profile, recommendations, skill_gaps, roadmap_courses)

    messages = [{"role": "system", "content": system_prompt}]
    for msg in payload.messages:
        messages.append({"role": msg.role, "content": msg.content})

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return ChatResponse(reply=response.choices[0].message.content)


def _fallback_response(user_msg: str, profile_id: int | None = None, db: Session | None = None) -> str:
    """WorkD AI rule-based fallback when no LLM API key is configured."""
    msg = user_msg.lower()

    # Try to load user context for personalised responses
    course_hint = ""
    mces_hint = ""
    if profile_id and db:
        try:
            from app.models.user_profile import UserProfile
            from app.services.roadmap_generator import generate_roadmap
            profile = db.get(UserProfile, profile_id)
            if profile:
                roadmap = generate_roadmap(profile, db)
                if roadmap:
                    course_hint = f" Based on your profile, I'd suggest starting with the {roadmap[0].course_title} by {roadmap[0].provider}."
                is_over_40 = (profile.age and profile.age >= 40) or (profile.years_experience >= 15)
                if is_over_40:
                    mces_hint = (" As you're eligible for the Mid-Career Enhanced Subsidy (MCES), "
                                 "you can get up to 90% course fee subsidy, plus a $4,000 SkillsFuture Credit top-up "
                                 "and Training Allowance of up to $6,000 during SCTP enrolment.")
        except Exception:
            pass

    if any(w in msg for w in ["salary", "pay", "compensation"]):
        return ("Great question! Singapore tech salaries vary by role and experience. "
                "Entry-level roles typically start at SGD 3,500-5,000/month, mid-level (3-5 years) "
                "ranges from SGD 5,000-9,000, and senior roles can exceed SGD 12,000. "
                "Check your recommended roles for specific salary ranges — that'll give you "
                f"a more targeted picture based on your skills.{mces_hint}")

    if any(w in msg for w in ["sctp", "skillsfuture", "course", "training", "subsidy"]):
        return ("SCTP courses are one of the best ways to upskill in Singapore! "
                "The government subsidises up to 70%% of course fees (or 90%% under MCES for mid-career switchers aged 40+). "
                "Plus, you can use your $500 SkillsFuture Credit to offset the remaining cost. "
                f"Check your Roadmap tab for personalised course recommendations.{course_hint}{mces_hint}")

    if any(w in msg for w in ["career switch", "transition", "change career"]):
        return ("Career switching is absolutely achievable — I've guided many professionals through it successfully! "
                "The key is to leverage your transferable skills (communication, problem-solving, stakeholder management) "
                "while building technical competencies through SCTP courses. "
                "Roles marked 'career-switcher friendly' in your recommendations are designed for people like you. "
                f"Start with your highest-priority skill gaps.{course_hint}{mces_hint}")

    if any(w in msg for w in ["interview", "prepare", "tips"]):
        return ("Here's my advice for tech interviews in Singapore:\n"
                "1. Review fundamentals for your target role\n"
                "2. Prepare STAR-format stories for behavioural questions\n"
                "3. Practice coding challenges on LeetCode or HackerRank\n"
                "4. Research the company's tech stack and culture\n\n"
                "Try the Mock Interview feature — it'll generate questions targeting your specific skill gaps!")

    if any(w in msg for w in ["resume", "cv"]):
        return ("For your resume, I'd recommend highlighting both your transferable skills and any new technical skills. "
                "Singapore employers value certifications from recognised providers like NUS-ISS and NTU. "
                "Make sure to include any SCTP course completions prominently. "
                "Use the Upload Resume feature to get an AI-powered analysis of your current CV.")

    if any(w in msg for w in ["portfolio", "project", "github"]):
        return ("Building a portfolio is a fantastic way to stand out! "
                "Focus on 2-3 projects that demonstrate skills relevant to your target roles. "
                "Check out the Project Suggestions feature — it generates portfolio ideas based on your skill gaps. "
                "Singapore employers especially value projects that solve real-world problems.")

    if any(w in msg for w in ["network", "linkedin", "connect"]):
        return ("Networking is crucial in Singapore's tech scene! Here are my top tips:\n"
                "1. Attend meetups — Singapore has active communities for most tech domains\n"
                "2. Optimise your LinkedIn profile with keywords from your target roles\n"
                "3. Join SCTP alumni groups — your course mates are your first professional network\n"
                "4. Consider informational interviews with people in your target roles")

    if any(w in msg for w in ["high growth", "demand", "trending", "top skills", "2026"]):
        insights = sorted(DEFAULT_INSIGHTS, key=lambda x: x["yoy_growth_pct"], reverse=True)
        top3 = insights[:3]
        lines = [f"Here are the highest-growth sectors in Singapore's 2026 tech market:\n"]
        for ins in top3:
            lines.append(f"  - {ins['role_category']}: {ins['yoy_growth_pct']}% YoY growth, avg SGD {ins['avg_salary_sgd']:,.0f}")
        lines.append(f"\nThese sectors have the strongest demand. I'd recommend focusing your upskilling on these areas.{course_hint}")
        return "\n".join(lines)

    return ("Hi! I'm WorkD AI, your Senior Career Advisor specialising in Singapore's tech market. "
            "I can help you with:\n\n"
            "- Understanding your job recommendations and match scores\n"
            "- Identifying high-growth roles matching your skills\n"
            "- SCTP course advice and SkillsFuture subsidies\n"
            "- Resume, portfolio, and interview tips\n"
            "- Singapore 2026 market insights and salary benchmarks\n"
            "- Career transition strategies\n\n"
            f"What would you like to know?{mces_hint}")
