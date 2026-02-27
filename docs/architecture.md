# SkillBridge — System Architecture

## Overview

SkillBridge is a job recommendation and skill gap analysis system for SCTP learners and career-switchers in Singapore.

```
Browser (Next.js SPA)
        │  REST / SSE
        ▼
API Gateway (HTTP API)
        │
        ▼
Lambda (FastAPI + Mangum, 3008 MB)
  ├── Recommender  — hybrid scoring (0.55/0.25/0.20 weights)
  ├── Gap Analyzer — FAISS skill matching + prerequisite graph
  ├── Roadmap Gen  — embed-based course matching
  ├── Chat / Interview — Gemini primary → Bedrock fallback
  └── Upload / RAG — S3 trigger + pgvector retrieval
        │
        ├── Aurora Serverless v2 (PostgreSQL + pgvector, private subnet)
        ├── S3 (resume storage, frontend static export)
        └── CloudFront (CDN for frontend)
```

## Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Hybrid scoring weights | 0.55 content + 0.25 rule + 0.20 career-switcher | Balances skill similarity with eligibility and equity |
| Vector search | FAISS (in-memory) | No external service needed; rebuilt on startup |
| LLM chain | Gemini → Bedrock Claude | Cost-effective primary; enterprise fallback |
| Auth | JWT (access 15 min + refresh 7 days) | Stateless; blacklist bounded to 10K entries |
| Multi-tenancy | `tenant_id` on all models | Single DB instance for all clients |
| Schema migrations | `_sync_schema()` for column adds | Avoids Alembic overhead for simple additions |

## Request Flow — Recommendations

```
POST /api/recommend
  → get_recommendations()
      → check InMemoryCache (TTL 300s)
      → build_skill_index(user_skills)  [FAISS]
      → for each JobRole:
          compute_content_similarity()  [_cached_encode LRU]
          _rule_score()                 [education + experience]
          _career_switcher_bonus()
      → sort by hybrid score
      → cache result
```

## Data Flow — Skill Gap + Roadmap

```
GET /api/skill-gap/{id}
  → analyze_gaps()
      → get_recommendations(top_n=3)
      → match_skills() per role
      → sort_by_prerequisites()    [skill_graph.py]

GET /api/upskilling/{id}
  → query SkillProgress (mastered_skills)
  → generate_roadmap(mastered_skills)
      → analyze_gaps()
      → embed-based course matching (threshold 0.45)
      → calculate_subsidies()
  → Bedrock narrative (graceful degradation)
```

## Lambda Deployment Notes

- Mangum adapter with `lifespan="off"` — startup logic runs in `lambda_handler.py`
- ML warmup in daemon thread (avoids API Gateway 29s timeout on cold start)
- 6 Lambda functions: `api`, `voice`, `rag-query`, `embed-gen`, `gap-analysis`, `resume-upload`
- Docker image: `--provenance=false` required for Lambda ECR compatibility
