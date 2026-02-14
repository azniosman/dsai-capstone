"""Skill matching using Sentence Transformers + FAISS for similarity search."""

import faiss
import numpy as np

from app.ml.embeddings import encode_texts
from app.ml.taxonomy import get_skill_category

# SSG category weights for skill importance
CATEGORY_WEIGHTS = {
    "critical_core": 1.3,
    "technical": 1.0,
    "generic": 0.8,
}


from functools import lru_cache

# ... imports ...


@lru_cache(maxsize=1024)
def _cached_encode(texts: tuple[str]) -> np.ndarray:
    """Cache embedding generation for immutable tuple of texts."""
    print(f"DEBUG: CACHE MISS - Encoding {len(texts)} texts: {texts[:2]}...")
    return encode_texts(list(texts)).astype(np.float32)


def build_skill_index(skills: list[str]) -> tuple[faiss.Index, list[str]]:
    """Build a FAISS index from a list of skill strings."""
    # Use cached encoding (convert list to tuple)
    embeddings = _cached_encode(tuple(skills))
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    return index, skills


def match_skills(
    user_skills: list[str],
    required_skills: list[str],
    partial_threshold: float = 0.6,
    strong_threshold: float = 0.85,
    cached_index: tuple[faiss.Index, list[str]] | None = None,
) -> dict[str, float]:
    """Score each required skill against user skills.

    Returns dict of {required_skill: score} where:
      1.0 = strong match
      0.5 = partial match
      0.0 = missing
    """
    if not user_skills or not required_skills:
        return {skill: 0.0 for skill in required_skills}

    if cached_index:
        user_index, _ = cached_index
    else:
        user_index, _ = build_skill_index(user_skills)
    
    # Use cached encoding for required skills (query)
    query_embeddings = _cached_encode(tuple(required_skills))

    scores, _ = user_index.search(query_embeddings, 1)

    result = {}
    for i, skill in enumerate(required_skills):
        sim = float(scores[i][0])
        # Exact text match override
        if skill.lower() in [u.lower() for u in user_skills]:
            result[skill] = 1.0
        elif sim >= strong_threshold:
            result[skill] = 1.0
        elif sim >= partial_threshold:
            result[skill] = 0.5
        else:
            result[skill] = 0.0
    return result


def compute_content_similarity(
    user_skills: list[str], 
    role_skills: list[str], 
    cached_index: tuple[faiss.Index, list[str]] | None = None
) -> float:
    """Compute weighted content similarity between user skills and role requirements.

    Applies SSG category weights: critical_core skills count 1.3x,
    technical 1.0x, generic 0.8x.
    """
    if not role_skills:
        return 0.0
    scores = match_skills(user_skills, role_skills, cached_index=cached_index)
    weighted_sum = 0.0
    weight_total = 0.0
    for skill, score in scores.items():
        w = CATEGORY_WEIGHTS.get(get_skill_category(skill), 1.0)
        weighted_sum += score * w
        weight_total += w
    if weight_total == 0:
        return 0.0
    if weight_total == 0:
        return 0.0
    return weighted_sum / weight_total


def warmup_skill_cache(skill_sets: list[list[str]]):
    """Force encoding of skill sets to populate LRU cache."""
    count = 0
    for skills in skill_sets:
        if skills:
            _cached_encode(tuple(skills))
            count += 1
    return count
