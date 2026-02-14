import json
import logging
from app.config import settings
import google.generativeai as genai

logger = logging.getLogger(__name__)

def extract_skills(resume_text: str) -> list[str]:
    """Extract skills from resume text using Gemini AI."""
    if not resume_text:
        return []

    if not settings.gemini_api_key:
        logger.warning("Gemini API key not set, returning empty skills list.")
        return []

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
            f"Resume Text:\n{resume_text[:10000]}"  # Truncate to avoid token limits if necessary
        )

        response = model.generate_content(prompt)
        
        text_response = response.text.strip()
        if text_response.startswith("```"):
            text_response = text_response.strip("`").replace("json", "", 1).strip()
            
        parsed = json.loads(text_response)
        return parsed.get("skills", [])

    except Exception as e:
        logger.exception("Gemini skill extraction failed: %s", e)
        return []
