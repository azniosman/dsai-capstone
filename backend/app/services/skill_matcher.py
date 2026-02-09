"""Skill matching using Sentence Transformers + FAISS for similarity search."""

import faiss
import numpy as np

from app.ml.embeddings import encode_texts


def build_skill_index(skills: list[str]) -> tuple[faiss.Index, list[str]]:
    """Build a FAISS index from a list of skill strings."""
    embeddings = encode_texts(skills).astype(np.float32)
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    return index, skills


def match_skills(
    user_skills: list[str],
    required_skills: list[str],
    partial_threshold: float = 0.6,
    strong_threshold: float = 0.85,
) -> dict[str, float]:
    """Score each required skill against user skills.

    Returns dict of {required_skill: score} where:
      1.0 = strong match
      0.5 = partial match
      0.0 = missing
    """
    if not user_skills or not required_skills:
        return {skill: 0.0 for skill in required_skills}

    user_index, _ = build_skill_index(user_skills)
    query_embeddings = encode_texts(required_skills).astype(np.float32)

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


def compute_content_similarity(user_skills: list[str], role_skills: list[str]) -> float:
    """Compute overall content similarity between user skills and role requirements."""
    if not role_skills:
        return 0.0
    scores = match_skills(user_skills, role_skills)
    return sum(scores.values()) / len(scores)
