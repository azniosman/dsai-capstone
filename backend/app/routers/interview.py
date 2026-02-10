"""Mock interview simulator endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

router = APIRouter(tags=["interview"])


class InterviewMessage(BaseModel):
    role: str
    content: str


class InterviewRequest(BaseModel):
    profile_id: int | None = None
    role_title: str
    messages: list[InterviewMessage] = []
    difficulty: str = "intermediate"  # "beginner", "intermediate", "advanced"


class InterviewResponse(BaseModel):
    reply: str
    feedback: str | None = None
    is_complete: bool = False
    question_number: int = 0


INTERVIEW_QUESTIONS = {
    "Data Engineer": [
        "Can you describe a data pipeline you've built from scratch? What tools did you use?",
        "How would you handle data quality issues in a streaming pipeline?",
        "Explain the difference between batch and stream processing. When would you use each?",
        "Tell me about a time you had to optimize a slow-running SQL query. What was your approach?",
        "How do you ensure data lineage and governance in your pipelines?",
    ],
    "Software Engineer": [
        "Walk me through your approach to designing a REST API for a new microservice.",
        "How do you handle database migrations in a production environment?",
        "Describe a challenging bug you've fixed. How did you diagnose the root cause?",
        "How would you design a system to handle 10x the current traffic?",
        "Tell me about your experience with CI/CD pipelines.",
    ],
    "Data Scientist": [
        "How do you decide between different ML models for a given problem?",
        "Explain how you would handle class imbalance in a classification problem.",
        "Walk me through your approach to feature engineering.",
        "How do you communicate model results to non-technical stakeholders?",
        "Describe a project where your model didn't perform as expected. What did you do?",
    ],
    "default": [
        "Tell me about yourself and your career journey so far.",
        "What interests you about this role and why are you a good fit?",
        "Describe a challenging project you've worked on. What was your role?",
        "How do you stay current with technology trends in your field?",
        "Where do you see yourself in 3-5 years?",
    ],
}


def _get_questions(role_title: str) -> list[str]:
    for key, qs in INTERVIEW_QUESTIONS.items():
        if key.lower() in role_title.lower():
            return qs
    return INTERVIEW_QUESTIONS["default"]


@router.post("/interview", response_model=InterviewResponse)
def mock_interview(payload: InterviewRequest, db: Session = Depends(get_db)):
    questions = _get_questions(payload.role_title)
    # Count user messages to determine question number
    user_msgs = [m for m in payload.messages if m.role == "user"]
    q_num = len(user_msgs)

    if settings.openai_api_key and payload.messages:
        return _llm_interview(payload, questions, q_num, db)

    # Rule-based flow
    if q_num >= len(questions):
        return InterviewResponse(
            reply="Great job completing the mock interview! Review your answers and consider how you could improve.",
            feedback=_generate_basic_feedback(payload.messages, payload.role_title),
            is_complete=True,
            question_number=q_num,
        )

    return InterviewResponse(
        reply=questions[q_num],
        feedback=_quick_feedback(user_msgs[-1].content) if user_msgs else None,
        is_complete=False,
        question_number=q_num + 1,
    )


def _quick_feedback(answer: str) -> str | None:
    if len(answer.split()) < 20:
        return "Tip: Try to elaborate more. Use the STAR format (Situation, Task, Action, Result) for behavioral answers."
    if len(answer.split()) > 200:
        return "Tip: Good detail! Try to be slightly more concise — aim for 1-2 minutes when speaking."
    return "Good response length. Remember to include specific examples and metrics where possible."


def _generate_basic_feedback(messages: list[InterviewMessage], role: str) -> str:
    user_answers = [m.content for m in messages if m.role == "user"]
    avg_len = sum(len(a.split()) for a in user_answers) / max(len(user_answers), 1)
    parts = [f"Mock Interview Summary for {role}:"]
    parts.append(f"- You answered {len(user_answers)} questions")
    parts.append(f"- Average response length: {int(avg_len)} words")
    if avg_len < 30:
        parts.append("- Consider providing more detailed answers with specific examples")
    elif avg_len > 150:
        parts.append("- Your answers are detailed. Practice being more concise for time-limited interviews")
    else:
        parts.append("- Good response length overall")
    parts.append("- Practice using the STAR format for behavioral questions")
    parts.append("- Prepare specific metrics and outcomes for your examples")
    return "\n".join(parts)


def _llm_interview(payload: InterviewRequest, questions: list[str], q_num: int, db: Session) -> InterviewResponse:
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)

    is_complete = q_num >= len(questions)

    system_prompt = (
        f"You are an experienced tech interviewer in Singapore conducting a mock interview for a {payload.role_title} role. "
        f"Difficulty level: {payload.difficulty}. "
        "After the candidate answers, provide brief constructive feedback, then ask the next question. "
        "Be encouraging but honest. Reference Singapore job market context when relevant."
    )
    if is_complete:
        system_prompt += " The interview is over. Provide a comprehensive summary of the candidate's performance."

    messages = [{"role": "system", "content": system_prompt}]
    for msg in payload.messages:
        messages.append({"role": msg.role, "content": msg.content})

    if is_complete:
        messages.append({"role": "user", "content": "Please provide your overall assessment of my interview performance."})

    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        max_tokens=512,
        temperature=0.7,
    )
    reply = response.choices[0].message.content

    return InterviewResponse(
        reply=reply,
        feedback=None,
        is_complete=is_complete,
        question_number=q_num + (0 if is_complete else 1),
    )
