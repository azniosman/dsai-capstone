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


def extract_skills(resume_text: str) -> list[str]:
    """Extract skills from text using Gemini AI, with keyword fallback."""
    if not resume_text:
        return []

    if settings.gemini_api_key:
        try:
            genai.configure(api_key=settings.gemini_api_key)
            model = genai.GenerativeModel(
                model_name=settings.gemini_model,
                generation_config={"response_mime_type": "application/json"}
            )

            prompt = (
                "Extract a list of technical skills, programming languages, tools, and frameworks from the following resume text. "
                "Return ONLY a JSON object with a single key 'skills' containing the list of strings. "
                "Normalize skills to their canonical names (e.g., 'React.js' -> 'React').\n\n"
                f"Resume Text:\n{resume_text[:10000]}"
            )

            response = model.generate_content(prompt)

            text_response = response.text.strip()
            if text_response.startswith("```"):
                text_response = text_response.strip("`").replace("json", "", 1).strip()

            parsed = json.loads(text_response)
            result = parsed.get("skills", [])
            if result:
                return result
            logger.warning("Gemini returned empty skills list — falling back to keyword extraction")
        except Exception as e:
            logger.warning("Gemini skill extraction failed (%s) — falling back to keyword extraction", e)
    else:
        logger.info("Gemini API key not set — using keyword extraction")

    return _keyword_extract(resume_text)
