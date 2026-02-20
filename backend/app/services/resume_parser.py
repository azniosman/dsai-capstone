import json
import logging
import re
from app.config import settings
import google.generativeai as genai

logger = logging.getLogger(__name__)


def _keyword_extract(text: str) -> list[str]:
    """Keyword-scan text against the skill taxonomy. Used when Gemini is unavailable."""
    try:
        from app.ml.taxonomy import _load_taxonomy
        skills, _ = _load_taxonomy()
    except Exception:
        # Absolute fallback: hardcoded common skills
        skills = [
            "Python", "JavaScript", "TypeScript", "Java", "SQL", "R", "Go", "Bash",
            "React", "Angular", "Vue.js", "Node.js", "Django", "FastAPI", "REST APIs",
            "GraphQL", "HTML/CSS", "Next.js",
            "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD",
            "Pandas", "NumPy", "Scikit-learn", "TensorFlow", "PyTorch", "NLP",
            "Machine Learning", "Deep Learning", "Data Analysis", "MLOps",
            "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
            "Spark", "Kafka", "Airflow", "ETL", "Snowflake",
            "Agile", "Scrum", "Git", "GitHub Actions",
        ]
    text_lower = text.lower()
    found = []
    for skill in skills:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def extract_skills(resume_text: str) -> dict:
    """Extract skills and structured career data from text using AWS Bedrock."""
    if not resume_text:
        return {
            "readiness_score": 0,
            "strengths": [],
            "missing_skills": [],
            "recommended_courses": [],
            "suggested_roles": [],
            "skills": []
        }

    from app.services.bedrock_service import bedrock_service
    
    system_prompt = (
        "You are an expert technical recruiter analyzing a resume. "
        "Extract the candidate's skills, strengths, missing standard modern tech skills, "
        "recommended learning courses, and suggested job roles. "
        "You MUST return ONLY a raw JSON object with the following exact keys: "
        "'readiness_score' (integer 0-100), 'strengths' (list of strings), "
        "'missing_skills' (list of strings), 'recommended_courses' (list of strings), "
        "'suggested_roles' (list of strings), and 'skills' (list of strings representing all extracted technical skills)."
        "Do not include markdown blocks or any other text before or after the JSON."
    )
    
    messages = [
        {"role": "user", "content": f"Resume Text:\n{resume_text[:10000]}"}
    ]

    try:
        response_text = bedrock_service.invoke_model(system_prompt=system_prompt, messages=messages, temperature=0.1)
        response_text = response_text.strip()
        if response_text.startswith("```"):
            response_text = response_text.strip("`").replace("json", "", 1).strip()
            
        parsed = json.loads(response_text)
        
        # Ensure all expected keys exist
        expected_keys = ["readiness_score", "strengths", "missing_skills", "recommended_courses", "suggested_roles", "skills"]
        for key in expected_keys:
            if key not in parsed:
                parsed[key] = [] if key != "readiness_score" else 0
                
        return parsed
        
    except Exception as e:
        logger.warning(f"Bedrock resume parsing failed: {e}. Falling back to keyword extraction.")
        skills = _keyword_extract(resume_text)
        return {
            "readiness_score": 50,
            "strengths": ["Identified basic technical keywords"],
            "missing_skills": ["Cloud Platforms", "System Design"],
            "recommended_courses": ["AWS Certified Solutions Architect", "Full Stack Development"],
            "suggested_roles": ["Software Engineer", "Data Analyst"],
            "skills": skills
        }
