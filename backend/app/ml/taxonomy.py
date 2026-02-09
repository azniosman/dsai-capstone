"""Skill taxonomy normalization — maps free-text skills to canonical names."""

import json
import os

import faiss
import numpy as np

from app.ml.embeddings import encode_texts

_taxonomy_index = None
_taxonomy_skills = None


def _load_taxonomy() -> list[str]:
    seed_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "data", "seed", "skills_taxonomy.json"
    )
    if not os.path.exists(seed_path):
        seed_path = "/data/seed/skills_taxonomy.json"  # Docker mount path
    with open(seed_path) as f:
        data = json.load(f)
    skills = []
    for category in data["categories"]:
        skills.extend(category["skills"])
    return skills


def get_taxonomy_index():
    global _taxonomy_index, _taxonomy_skills
    if _taxonomy_index is None:
        _taxonomy_skills = _load_taxonomy()
        embeddings = encode_texts(_taxonomy_skills)
        dim = embeddings.shape[1]
        _taxonomy_index = faiss.IndexFlatIP(dim)
        _taxonomy_index.add(embeddings.astype(np.float32))
    return _taxonomy_index, _taxonomy_skills


def normalize_skill(skill_text: str, threshold: float = 0.75) -> str | None:
    """Map a free-text skill to the closest canonical taxonomy skill.

    Returns the canonical skill name if similarity >= threshold, else None.
    """
    index, skills = get_taxonomy_index()
    query = encode_texts([skill_text]).astype(np.float32)
    scores, indices = index.search(query, 1)
    if scores[0][0] >= threshold:
        return skills[indices[0][0]]
    return None


def normalize_skills(skill_texts: list[str], threshold: float = 0.75) -> list[str]:
    """Normalize a list of skills, dropping any that don't match the taxonomy."""
    index, skills = get_taxonomy_index()
    if not skill_texts:
        return []
    queries = encode_texts(skill_texts).astype(np.float32)
    scores, indices = index.search(queries, 1)
    result = []
    for i, text in enumerate(skill_texts):
        if scores[i][0] >= threshold:
            result.append(skills[indices[i][0]])
        else:
            result.append(text)  # Keep original if no match
    return list(set(result))
