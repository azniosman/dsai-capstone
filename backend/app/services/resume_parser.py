"""Resume parser using spaCy NER for skill extraction."""

import re

import spacy

from app.ml.taxonomy import normalize_skills

_nlp = None


def _get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except OSError:
            # Fallback: import the model package directly
            import en_core_web_sm
            _nlp = en_core_web_sm.load()
    return _nlp


# Common tech skills pattern for rule-based matching
SKILL_PATTERNS = [
    r"\bPython\b", r"\bJava(?:Script)?\b", r"\bTypeScript\b", r"\bC\+\+\b",
    r"\bGo(?:lang)?\b", r"\bRust\b", r"\bR\b", r"\bSQL\b", r"\bBash\b",
    r"\bReact\b", r"\bAngular\b", r"\bVue\.?js?\b", r"\bNode\.?js\b",
    r"\bDjango\b", r"\bFastAPI\b", r"\bFlask\b", r"\bSpring\b",
    r"\bAWS\b", r"\bAzure\b", r"\bGCP\b", r"\bDocker\b", r"\bKubernetes\b",
    r"\bTerraform\b", r"\bCI/CD\b", r"\bJenkins\b", r"\bGitHub Actions\b",
    r"\bSpark\b", r"\bKafka\b", r"\bAirflow\b", r"\bSnowflake\b",
    r"\bPandas\b", r"\bNumPy\b", r"\bScikit-learn\b", r"\bTensorFlow\b",
    r"\bPyTorch\b", r"\bNLP\b", r"\bMLOps\b", r"\bComputer Vision\b",
    r"\bPostgreSQL\b", r"\bMySQL\b", r"\bMongoDB\b", r"\bRedis\b",
    r"\bElasticsearch\b", r"\bDynamoDB\b",
    r"\bREST API\b", r"\bGraphQL\b", r"\bmicroservices\b",
    r"\bPenetration Testing\b", r"\bSIEM\b", r"\bIAM\b",
    r"\bAgile\b", r"\bScrum\b", r"\bData Warehousing\b", r"\bETL\b",
    r"\bdbt\b", r"\bTableau\b", r"\bPower BI\b",
    r"\bLinux\b", r"\bNetworking\b", r"\bTCP/IP\b",
    r"\bMachine Learning\b", r"\bDeep Learning\b", r"\bData Science\b",
]


def extract_skills(resume_text: str) -> list[str]:
    """Extract skills from resume text using regex patterns + spaCy NER."""
    found = set()

    # Rule-based extraction
    for pattern in SKILL_PATTERNS:
        matches = re.findall(pattern, resume_text, re.IGNORECASE)
        for match in matches:
            found.add(match.strip())

    # spaCy NER — extract ORG/PRODUCT entities as potential skills/tools
    nlp = _get_nlp()
    doc = nlp(resume_text)
    for ent in doc.ents:
        if ent.label_ in ("ORG", "PRODUCT"):
            found.add(ent.text.strip())

    raw_skills = list(found)
    normalized = normalize_skills(raw_skills)
    return normalized
