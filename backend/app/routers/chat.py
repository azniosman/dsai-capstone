"""LLM career coach chatbot endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    profile_id: int | None = None
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


def _build_system_prompt(profile, recommendations=None):
    parts = [
        "You are an expert career coach specializing in Singapore's tech job market and the SCTP programme.",
        "You help users understand their career options, skill gaps, and upskilling paths.",
        "Be encouraging but honest. Give specific, actionable advice.",
        "Reference Singapore-specific context: SkillsFuture credits, SCTP courses, local job market.",
    ]
    if profile:
        parts.append(f"\nUser Profile: Name={profile.name}, Education={profile.education}, "
                     f"Experience={profile.years_experience}yrs, Skills={profile.skills}, "
                     f"Career Switcher={profile.is_career_switcher}")
    if recommendations:
        rec_text = ", ".join(f"{r.title} ({round(r.match_score*100)}%)" for r in recommendations[:3])
        parts.append(f"\nTop recommended roles: {rec_text}")
    return "\n".join(parts)


@router.post("/chat", response_model=ChatResponse)
def career_chat(payload: ChatRequest, db: Session = Depends(get_db)):
    if not settings.openai_api_key:
        # Fallback: rule-based response when no API key configured
        return ChatResponse(reply=_fallback_response(payload.messages[-1].content if payload.messages else ""))

    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)

    profile = None
    recommendations = None
    if payload.profile_id:
        from app.models.user_profile import UserProfile
        profile = db.get(UserProfile, payload.profile_id)
        if profile:
            from app.services.recommender import get_recommendations
            try:
                recommendations = get_recommendations(profile, db, top_n=3)
            except Exception:
                pass

    system_prompt = _build_system_prompt(profile, recommendations)

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


def _fallback_response(user_msg: str) -> str:
    """Simple rule-based fallback when no LLM API key is configured."""
    msg = user_msg.lower()
    if any(w in msg for w in ["salary", "pay", "compensation"]):
        return ("Singapore tech salaries vary widely. Entry-level roles start around SGD 3,500-5,000/month. "
                "Mid-level (3-5 years) typically earn SGD 5,000-9,000. Senior roles can exceed SGD 12,000. "
                "Check your recommended roles for specific ranges.")
    if any(w in msg for w in ["sctp", "skillsfuture", "course", "training"]):
        return ("SCTP (SkillsFuture Career Transition Programme) offers subsidized training for career switchers. "
                "Courses range from 4-16 weeks. Check your Roadmap tab for personalized course recommendations. "
                "You can use your SkillsFuture Credits to offset costs.")
    if any(w in msg for w in ["career switch", "transition", "change career"]):
        return ("Career switching is very achievable! Focus on transferable skills first, then build technical "
                "competencies through SCTP courses. Roles marked 'career-switcher friendly' in your recommendations "
                "are great starting points. Start with your highest-priority skill gaps.")
    if any(w in msg for w in ["interview", "prepare", "tips"]):
        return ("For tech interviews in Singapore: 1) Review fundamentals for the role. 2) Prepare STAR-format "
                "stories for behavioral questions. 3) Practice coding challenges on LeetCode/HackerRank. "
                "4) Research the company's tech stack. Try the Mock Interview feature for practice!")
    return ("I'm your career intelligence assistant! I can help with:\n"
            "- Understanding your job recommendations\n"
            "- Explaining skill gaps and priorities\n"
            "- SCTP course advice\n"
            "- Singapore tech market insights\n"
            "- Career transition strategies\n\n"
            "What would you like to know?")
