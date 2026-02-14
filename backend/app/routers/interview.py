"""Mock interview simulator endpoint with skill-gap-aware question selection."""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.auth import get_current_user_optional

router = APIRouter(tags=["interview"])

OPENAI_TIMEOUT_SECONDS = 30


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
    gap_targeted: bool = False
    target_skill: str | None = None


# Role-specific interview questions
ROLE_QUESTIONS = {
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

# Skill-category-based questions for gap targeting
CATEGORY_QUESTIONS = {
    "Programming Languages": [
        ("Python", "Can you walk me through how you'd design a Python package with proper error handling and testing?"),
        ("JavaScript", "Explain the event loop in JavaScript. How does asynchronous code execution work?"),
        ("SQL", "How would you optimise a slow query that joins five tables with millions of rows?"),
        ("Java", "Describe the differences between Java's concurrency primitives and when you'd use each."),
        ("TypeScript", "What advantages does TypeScript's type system bring to large-scale applications?"),
    ],
    "Web Development": [
        ("React", "How do you manage state in a complex React application? Compare different approaches."),
        ("REST APIs", "What makes a RESTful API well-designed? Walk me through your API design process."),
        ("Node.js", "How would you handle high-concurrency requests in a Node.js application?"),
        ("FastAPI", "What are the benefits of async endpoints in FastAPI, and when would you use them?"),
        ("HTML/CSS", "How do you ensure web accessibility and responsive design in your front-end work?"),
    ],
    "Cloud & DevOps": [
        ("AWS", "Describe how you'd architect a highly available application on AWS. What services would you use?"),
        ("Docker", "Explain the difference between Docker images and containers. How do you optimise image size?"),
        ("Kubernetes", "How would you handle a rolling deployment in Kubernetes? What about rollback strategies?"),
        ("CI/CD", "Walk me through your ideal CI/CD pipeline. What checks and stages would you include?"),
        ("Terraform", "How do you manage infrastructure state across multiple environments using Terraform?"),
    ],
    "Data Engineering": [
        ("Spark", "How would you optimise a Spark job that's running out of memory on a large dataset?"),
        ("Kafka", "Explain how you'd design a Kafka-based event streaming architecture for real-time analytics."),
        ("ETL", "What's your approach to building reliable ETL pipelines? How do you handle failures?"),
        ("Airflow", "How do you design DAGs in Airflow for complex data workflows with dependencies?"),
        ("Data Warehousing", "Compare star schema vs snowflake schema. When would you use each?"),
    ],
    "Data Science & ML": [
        ("Scikit-learn", "Walk me through your process for selecting and validating a machine learning model."),
        ("TensorFlow", "How do you approach hyperparameter tuning in deep learning models?"),
        ("NLP", "Describe how you'd build a text classification system. What preprocessing steps are essential?"),
        ("MLOps", "How do you monitor model performance in production and handle model drift?"),
        ("Feature Engineering", "What techniques do you use for feature selection and engineering?"),
    ],
    "Cybersecurity": [
        ("Network Security", "How would you design a network security architecture for a cloud-native application?"),
        ("SIEM", "Describe your experience with SIEM tools. How do you tune alerts to reduce false positives?"),
        ("IAM", "Walk me through implementing a zero-trust identity and access management strategy."),
        ("Incident Response", "Describe your incident response process. How do you handle a suspected data breach?"),
        ("Penetration Testing", "What methodology do you follow for penetration testing? Walk me through a recent engagement."),
    ],
    "Databases": [
        ("PostgreSQL", "How would you design a database schema for a multi-tenant SaaS application?"),
        ("MongoDB", "When would you choose a document database over relational? What are the trade-offs?"),
        ("Redis", "How do you use Redis for caching? Describe your cache invalidation strategy."),
        ("Elasticsearch", "How would you design an Elasticsearch cluster for full-text search at scale?"),
        ("DynamoDB", "Explain DynamoDB's partition key design. How do you avoid hot partitions?"),
    ],
    "Networking": [
        ("TCP/IP", "Explain the TCP three-way handshake. How does it differ from UDP for real-time applications?"),
        ("Load Balancing", "Compare different load balancing algorithms. When would you use each?"),
        ("DNS", "How does DNS resolution work? How would you troubleshoot DNS-related issues?"),
        ("HTTP/HTTPS", "Explain TLS handshake process. What are the performance implications of HTTPS?"),
        ("CDN", "How would you design a CDN strategy for a global web application?"),
    ],
    "Soft Skills": [
        ("Communication", "Tell me about a time you had to explain a complex technical concept to a non-technical audience."),
        ("Problem Solving", "Describe a situation where you had to solve a problem with limited information. What was your approach?"),
        ("Teamwork", "How do you handle disagreements within a team? Give me a specific example."),
        ("Agile", "How do you estimate work in an Agile environment? How do you handle scope changes mid-sprint?"),
        ("Leadership", "Describe a time you took initiative on a project. How did you motivate others?"),
    ],
}


def _get_role_questions(role_title: str) -> list[str]:
    for key, qs in ROLE_QUESTIONS.items():
        if key.lower() in role_title.lower():
            return qs
    return ROLE_QUESTIONS["default"]


def _get_gap_targeted_questions(profile_id: int, db: Session, tenant_id: int) -> list[tuple[str, str, str]]:
    """Fetch user's skill gaps and return targeted questions.

    Returns list of (question, target_skill, category) tuples sorted by gap severity.
    """
    try:
        from app.models.user_profile import UserProfile
        from app.services.gap_analyzer import analyze_gaps

        profile = db.query(UserProfile).filter(UserProfile.id == profile_id, UserProfile.tenant_id == tenant_id).first()
        if not profile:
            return []

        gaps = analyze_gaps(profile, db, tenant_id=tenant_id)

        # Collect gap skills with severity ordering
        gap_skills = []
        seen = set()
        for role_gap in gaps:
            for g in role_gap.gaps:
                if g.gap_severity in ("high", "medium") and g.skill not in seen:
                    seen.add(g.skill)
                    gap_skills.append((g.skill, g.gap_severity))

        # Sort: high severity first
        gap_skills.sort(key=lambda x: 0 if x[1] == "high" else 1)

        # Find matching questions from category bank
        targeted = []
        for skill, severity in gap_skills:
            for category, questions in CATEGORY_QUESTIONS.items():
                for q_skill, question in questions:
                    if q_skill.lower() == skill.lower():
                        targeted.append((question, skill, category))
                        break

        return targeted
    except Exception as e:
        logging.exception("Failed to load gap-targeted questions for profile_id=%s: %s", profile_id, e)
        raise


@router.post("/interview", response_model=InterviewResponse)
def mock_interview(payload: InterviewRequest, db: Session = Depends(get_db), user=Depends(get_current_user_optional)):
    tenant_id = user.tenant_id if user else 1  # fallback to global tenant
    role_questions = _get_role_questions(payload.role_title)
    # Count user messages to determine question number
    user_msgs = [m for m in payload.messages if m.role == "user"]
    q_num = len(user_msgs)

    # Build mixed question set: 3 gap-targeted + 2 role-specific (or fallback to all role)
    gap_questions = []
    if payload.profile_id:
        try:
            gap_questions = _get_gap_targeted_questions(payload.profile_id, db, tenant_id)
        except Exception as e:
            logging.exception(
                "Gap-targeted questions failed for profile_id=%s, using generic questions: %s",
                payload.profile_id,
                e,
            )
            # gap_questions remains []; interview continues with role questions only

    # Compose final question list: up to 3 gap-targeted, then fill with role questions
    mixed_questions = []
    gap_meta = {}  # index -> (target_skill)
    for i, (q, skill, cat) in enumerate(gap_questions[:3]):
        mixed_questions.append(q)
        gap_meta[len(mixed_questions) - 1] = skill

    remaining_slots = 5 - len(mixed_questions)
    for rq in role_questions:
        if rq not in mixed_questions and remaining_slots > 0:
            mixed_questions.append(rq)
            remaining_slots -= 1

    # Fall back to role questions only if no gap questions found
    if not mixed_questions:
        mixed_questions = role_questions

    if settings.openai_api_key and payload.messages:
        return _llm_interview(payload, mixed_questions, gap_meta, q_num, db)

    # Rule-based flow
    if q_num >= len(mixed_questions):
        return InterviewResponse(
            reply="Great job completing the mock interview! Review your answers and consider how you could improve.",
            feedback=_generate_basic_feedback(payload.messages, payload.role_title),
            is_complete=True,
            question_number=q_num,
        )

    is_gap = q_num in gap_meta
    return InterviewResponse(
        reply=mixed_questions[q_num],
        feedback=_quick_feedback(user_msgs[-1].content) if user_msgs else None,
        is_complete=False,
        question_number=q_num + 1,
        gap_targeted=is_gap,
        target_skill=gap_meta.get(q_num),
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


def _llm_interview(
    payload: InterviewRequest,
    questions: list[str],
    gap_meta: dict[int, str],
    q_num: int,
    db: Session,
) -> InterviewResponse:
    from openai import OpenAI
    client = OpenAI(api_key=settings.openai_api_key)

    is_complete = q_num >= len(questions)

    # Build gap context for the LLM
    gap_context = ""
    if gap_meta:
        gap_skills = list(gap_meta.values())
        gap_context = (
            f"\nThe candidate has skill gaps in: {', '.join(gap_skills)}. "
            "Tailor follow-up questions to probe these areas. "
            "For high-severity gaps, ask foundational questions; for medium gaps, ask applied scenarios."
        )

    system_prompt = (
        f"You are an experienced tech interviewer in Singapore conducting a mock interview for a {payload.role_title} role. "
        f"Difficulty level: {payload.difficulty}. "
        "After the candidate answers, provide brief constructive feedback, then ask the next question. "
        "Be encouraging but honest. Reference Singapore job market context when relevant."
        f"{gap_context}"
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
        timeout=OPENAI_TIMEOUT_SECONDS,
    )
    reply = response.choices[0].message.content

    is_gap = q_num in gap_meta
    return InterviewResponse(
        reply=reply,
        feedback=None,
        is_complete=is_complete,
        question_number=q_num + (0 if is_complete else 1),
        gap_targeted=is_gap,
        target_skill=gap_meta.get(q_num),
    )
