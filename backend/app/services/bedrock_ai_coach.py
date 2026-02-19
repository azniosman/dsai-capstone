"""
Bedrock AI Coach — high-level career coaching interface.

Wraps bedrock_service with SkillBridge-specific prompting, context assembly,
and graceful fallback to rule-based responses when Bedrock is unavailable.

Usage:
    from app.services.bedrock_ai_coach import ai_coach
    response = await ai_coach.chat(user_message, profile, history)
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Career coaching system prompt
_SYSTEM_PROMPT = """You are SkillBridge AI Coach, an expert career advisor specialising in
Singapore's technology job market, SkillsFuture programmes, and SCTP (Skills-based Training
Curriculum Programme) courses.

Your role:
- Provide personalised career advice based on the user's profile and goals
- Identify skill gaps and recommend specific SCTP courses and certifications
- Give concrete, actionable next steps (not generic platitudes)
- Reference Singapore-specific programmes: SkillsFuture Credit, MCES subsidies, IBF, WSQ
- Be encouraging but realistic about timelines and effort required

Response style:
- Concise and structured (use bullet points for lists)
- Data-driven when possible (salary ranges, course duration, pass rates)
- Singapore English is fine but keep it professional
- If you don't know something, say so and suggest where to find out

Always ground advice in the user's specific profile when provided."""


class BedrockAICoach:
    """High-level AI coach powered by Amazon Bedrock (Claude 3.5 Sonnet)."""

    def __init__(self) -> None:
        self._service = None  # Lazy-init to avoid import errors when Bedrock unavailable

    def _get_service(self):
        if self._service is None:
            try:
                from app.services.bedrock_service import bedrock_service
                self._service = bedrock_service
            except Exception as exc:
                logger.warning("Bedrock service unavailable: %s", exc)
                self._service = False  # Cache the failure to avoid repeated attempts
        return self._service if self._service else None

    def chat(
        self,
        user_message: str,
        profile: dict[str, Any] | None = None,
        conversation_history: list[dict] | None = None,
        *,
        temperature: float = 0.7,
    ) -> str:
        """Generate a coaching response for the given user message.

        Args:
            user_message: The user's latest message.
            profile: Optional user profile dict (skills, target roles, experience).
            conversation_history: Prior messages [{"role": "user"|"assistant", "content": str}].
            temperature: Sampling temperature (0.0 = deterministic, 1.0 = creative).

        Returns:
            Coaching response string.
        """
        service = self._get_service()
        if service is None:
            return self._fallback_response(user_message)

        system = self._build_system_prompt(profile)
        messages = self._build_messages(user_message, conversation_history)

        try:
            return service.invoke_model(
                system_prompt=system,
                messages=messages,
                temperature=temperature,
            )
        except Exception as exc:
            logger.error("Bedrock chat error: %s", exc)
            return self._fallback_response(user_message)

    def generate_roadmap(
        self,
        profile: dict[str, Any],
        target_role: str,
        skill_gaps: list[str],
    ) -> str:
        """Generate a personalised upskilling roadmap as markdown."""
        service = self._get_service()

        prompt = (
            f"Create a detailed 6-month upskilling roadmap for a career-switcher "
            f"targeting '{target_role}' in Singapore.\n\n"
            f"Current profile: {profile}\n"
            f"Key skill gaps to address: {', '.join(skill_gaps)}\n\n"
            f"Include: SCTP/SkillsFuture courses, estimated costs after subsidies, "
            f"weekly time commitment, and milestones. Format as markdown."
        )

        if service is None:
            return self._fallback_roadmap(target_role, skill_gaps)

        try:
            return service.invoke_model(
                system_prompt=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
            )
        except Exception as exc:
            logger.error("Bedrock roadmap error: %s", exc)
            return self._fallback_roadmap(target_role, skill_gaps)

    def generate_interview_question(
        self,
        role: str,
        difficulty: str = "medium",
        question_type: str = "technical",
    ) -> dict[str, str]:
        """Generate a mock interview question with a model answer."""
        service = self._get_service()

        prompt = (
            f"Generate one {difficulty} {question_type} interview question for a "
            f"'{role}' position in Singapore tech industry.\n\n"
            f"Return JSON with keys: 'question', 'model_answer', 'key_points' (list), "
            f"'follow_up' (optional follow-up question)."
        )

        if service is None:
            return {
                "question": f"Tell me about your experience relevant to the {role} role.",
                "model_answer": "Focus on specific projects, quantified impact, and skills used.",
                "key_points": ["Be specific", "Quantify impact", "Link to role requirements"],
            }

        try:
            import json as _json
            raw = service.invoke_model(
                system_prompt=_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
            )
            # Try to parse JSON; fall back to plain text if model doesn't comply
            try:
                return _json.loads(raw)
            except _json.JSONDecodeError:
                return {"question": raw, "model_answer": "", "key_points": []}
        except Exception as exc:
            logger.error("Bedrock interview question error: %s", exc)
            return {"question": f"Describe a challenging project you led as a {role}.", "key_points": []}

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_system_prompt(self, profile: dict | None) -> str:
        if not profile:
            return _SYSTEM_PROMPT
        profile_summary = (
            f"\n\nUser profile:\n"
            f"- Skills: {', '.join(profile.get('skills', []))}\n"
            f"- Experience: {profile.get('years_experience', '?')} years\n"
            f"- Target roles: {', '.join(profile.get('desired_roles', []))}\n"
            f"- Current role: {profile.get('current_role', 'Not specified')}"
        )
        return _SYSTEM_PROMPT + profile_summary

    def _build_messages(
        self,
        user_message: str,
        history: list[dict] | None,
    ) -> list[dict]:
        messages = []
        if history:
            for entry in history[-10:]:  # Keep last 10 turns to manage context window
                role = entry.get("role", "user")
                if role == "model":
                    role = "assistant"
                messages.append({"role": role, "content": entry.get("content", "")})
        messages.append({"role": "user", "content": user_message})
        return messages

    def _fallback_response(self, message: str) -> str:
        return (
            "I'm your SkillBridge AI Coach! While my AI engine is warming up, "
            "here are some quick tips:\n\n"
            "• Browse SCTP courses at **MySkillsFuture.gov.sg**\n"
            "• Use the Skill Gap tab to see what skills you're missing\n"
            "• Check the Roadmap tab for your personalised learning path\n\n"
            "Please try again in a moment for a personalised response."
        )

    def _fallback_roadmap(self, role: str, gaps: list[str]) -> str:
        gap_list = "\n".join(f"  - {g}" for g in gaps[:5])
        return (
            f"## Upskilling Roadmap → {role}\n\n"
            f"### Priority Skills to Develop\n{gap_list}\n\n"
            "### Recommended Next Steps\n"
            "1. Identify relevant SCTP courses on MySkillsFuture\n"
            "2. Apply for SkillsFuture Credit (S$500 top-up available)\n"
            "3. Consider MCES subsidy (up to 90% for eligible participants)\n"
            "4. Join relevant online communities and build portfolio projects\n\n"
            "*Full AI roadmap will be available shortly.*"
        )


# Module-level singleton
ai_coach = BedrockAICoach()
