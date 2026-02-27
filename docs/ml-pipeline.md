# SkillBridge — ML Pipeline

## Models

| Model | Purpose | Dimensions |
|---|---|---|
| `all-MiniLM-L6-v2` | Skill embeddings (FAISS, recommendations) | 384 |
| Amazon Titan Embed Text v1 | pgvector RAG pipeline | 1536 |

Both are encoded via `backend/app/ml/embeddings.py`.

## Skill Embedding Pipeline

```
encode_texts(texts)
  → SageMaker endpoint (if SAGEMAKER_EMBEDDING_ENDPOINT set)
  → SentenceTransformer local (fallback)
  → np.ndarray, L2-normalised
```

The model is a module-level singleton (`_model`), loaded once at startup.

## FAISS Index

- Built in `build_skill_index(skills)` — `IndexFlatIP` (inner product = cosine for L2-normalised vectors)
- One index per user-skills list, cached by `@lru_cache(maxsize=1024)` in `skill_matcher.py`
- Role skill embeddings pre-computed at warmup and stored in `_role_embedding_cache`

## Skill Matching

```python
match_skills(user_skills, required_skills) → dict[skill, score]
  score = 1.0  (strong:  cosine ≥ 0.85, or exact text match)
  score = 0.5  (partial: cosine ≥ 0.60)
  score = 0.0  (missing)
```

## Taxonomy Normalisation

`backend/app/ml/taxonomy.py` — FAISS index over 150+ canonical skill names.
Maps free-text skills (e.g. "tf", "tensorflow 2") to canonical form (e.g. "TensorFlow").
Threshold: cosine ≥ 0.75.

## Prerequisite Skill Graph

`backend/app/ml/skill_graph.py` — hardcoded prerequisite DAG (~30 relationships).

```python
PREREQUISITES = {
    "PyTorch": ["Python", "NumPy"],
    "Kubernetes": ["Docker"],
    ...
}
```

`sort_by_prerequisites(gap_skills)` performs topological sort so foundational skills
(e.g. Python, SQL) appear before advanced ones (e.g. PyTorch, dbt) in the gap list.

## Hybrid Scoring Formula

```
match_score = 0.55 × content_score
            + 0.25 × rule_score
            + 0.20 × career_switcher_bonus
```

- `content_score` — weighted cosine similarity (critical_core × 1.3, technical × 1.0, generic × 0.8)
- `rule_score` — education + experience ladder match (0–1)
- `career_switcher_bonus` — tapers with experience: `max(0, 1 − years × 0.1)`

## Course Matching (Roadmap)

```
for each gap skill:
  1. Encode skill text → embedding
  2. For each course: cosine_similarity(skill_emb, course_emb) ≥ 0.45
  3. Among matches: prefer highest (similarity + 0.1 × multi-skill coverage)
  4. Fallback to keyword match if no embed match
```

Course embeddings are module-level cached (`_course_embedding_cache`) on first call.

## LLM Fallback Chain

```
chat / interview / narrative:
  Gemini 2.0 Flash (primary)  →  AWS Bedrock Claude 3.5 Sonnet (fallback)  →  503

extract_skills() (resume parser):
  Gemini (primary)  →  regex keyword scan against taxonomy (fallback)
```
