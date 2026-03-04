# SkillBridge — ML & Intelligence Pipeline

## Phase 1 (Current — Active in Production)

### Active Components

| Component | Technology | Location |
|---|---|---|
| Resume text extraction | `pdf-parse` (PDF), `mammoth` (DOCX) | `nestjs-backend/src/common/utils/resume-parser.util.ts` |
| Resume structured parsing | LLM (see provider chain below) | `LlmService.parseResume()` |
| Skill matching | Set intersection (exact + case-insensitive) | `IntelligenceService.scoreRole()` |
| Job recommendation ranking | Hybrid scoring formula (see below) | `IntelligenceService.getRecommendations()` |
| Skill gap advice | LLM — one call per role batch | `LlmService.generateSkillGapAdvice()` |
| JD match analysis | LLM skill extraction + set intersection | `LlmService.analyzeJobDescription()` |
| Career chat | LLM with profile context injection | `IntelligenceService.chat()` |
| Upskilling narrative | LLM | `LlmService.generateRoadmapNarrative()` |

### LLM Provider Chain

Requests are routed in priority order. Each provider is skipped if its API key
is absent. Order is configurable via env vars.

```
PRIMARY_LLM   (default: groq)   →  Groq  llama-3.3-70b-versatile
SECONDARY_LLM (default: claude) →  Anthropic  claude-3-5-sonnet-20241022
TERTIARY_LLM  (default: gemini) →  Google  gemini-2.0-flash
                                →  HTTP 503 if all fail
```

Config env vars: `PRIMARY_LLM`, `SECONDARY_LLM`, `TERTIARY_LLM`,
`AI_TEMPERATURE` (default `0.3`), `AI_MAX_TOKENS` (default `2048`).

Implementation: `nestjs-backend/src/intelligence/llm.service.ts`

### Hybrid Scoring Formula

```
match_score = 0.55 × content_score
            + 0.25 × rule_score
            + 0.20 × career_switcher_bonus
```

- `content_score` — `matched_skills / total_required_skills` (exact string match)
- `rule_score` — `1.0` if `profile.yearsExperience >= role.minExperienceYears`, else `0.5`
- `career_switcher_bonus` — `1.0` if both `profile.isCareerSwitcher` and `role.careerSwitcherFriendly` are true, else `0.0`

Top 10 roles returned, top 3 enhanced with LLM-generated rationale.

### Skill Gap Severity

Gap severity is assigned positionally within `role.requiredSkills`:

| Position | Severity | Required Level |
|---|---|---|
| Index 0–2 | `high` | required |
| Index 3+ | `medium` | required |
| Any | `low` | preferred |

Top 5 gaps per role returned, sorted by severity descending. LLM advice is
generated for all 3 role entries concurrently via `Promise.allSettled`.

---

## Phase 2 (Planned — Not Yet Implemented)

> The components below are **stubs only**. The Lambda handlers exist in
> `lambdas/` but return HTTP 501 and reference services that do not exist.
> The EventBridge schedule for `embedding-backfill` is **DISABLED** until
> the NestJS handler is implemented.

### Embedding Pipeline

**Planned model**: `all-MiniLM-L6-v2` (384-dim, sentence-transformers)
**Planned library**: `@xenova/transformers` (Node.js ONNX runtime — no Python needed)
**Vector store**: pgvector (extension already installed on PostgreSQL 16)

Planned flow:

```
Text (resume chunk / skill / query)
    │
    ▼
EmbeddingService.embed(text) → float32[384]  (all-MiniLM-L6-v2)
    │
    ▼
ProfileEmbedding / DocumentChunk entity
  .embedding  pgvector column  vector(384)
    │
    ▼
CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)
```

### Document Chunking

Planned strategy:
- Chunk size: 512 tokens
- Overlap: 64 tokens
- Metadata per chunk: `profile_id`, `source`, `chunk_index`, `created_at`, `content_hash`
- Idempotency: SHA-256 hash of content — skip re-embedding if hash matches

### RAG Retrieval Flow

```
User query
    │
    ▼
EmbeddingService.embed(query)
    │
    ▼
pgvector cosine similarity search (top-K, threshold ≥ 0.65)
    │
    ▼
Chunks injected into LLM system prompt:
  [SYSTEM INSTRUCTIONS]
  [RETRIEVED CONTEXT — up to 3 chunks]
  [USER QUESTION]
    │
    ▼
LLM provider chain (Groq → Claude → Gemini)
```

### Phase 2 Stub Files

| File | Status | Reason |
|---|---|---|
| `lambdas/rag_query_handler.py` | STUB — returns 501 | `app.services.rag_service` does not exist |
| `lambdas/embedding_generator.py` | STUB — returns 501 | `app.services.rag_service` does not exist |
| `lambdas/resume_upload_handler.py` | STUB — returns 501 | `app.services.rag_service` does not exist |
| EventBridge `embedding-backfill` schedule | DISABLED | `/internal/embeddings/backfill` NestJS handler not yet implemented |

### Phase 2 Implementation Checklist

- [x] `EmbeddingService` — NestJS injectable wrapping `@xenova/transformers` (`src/rag/embedding.service.ts`)
- [x] `DocumentChunk` entity with `vector(384)` pgvector column + content_hash idempotency (`src/entities/document-chunk.entity.ts`)
- [x] Custom `VectorType` for MikroORM → pgvector serialisation (`src/common/types/vector.type.ts`)
- [x] pgvector extension enabled at bootstrap (`src/main.ts` — `CREATE EXTENSION IF NOT EXISTS vector`)
- [x] HNSW index created at bootstrap (`CREATE INDEX IF NOT EXISTS ... USING hnsw (embedding vector_cosine_ops)`)
- [x] `RagService.query()` — embed + pgvector cosine similarity search (`src/rag/rag.service.ts`)
- [x] `RagService.storeChunks()` — chunking + embedding + hash-idempotent upsert
- [x] `RagService.backfill()` — re-embed NULL-embedding chunks
- [x] `POST /api/rag/query` NestJS controller (`src/rag/rag.controller.ts`)
- [x] `POST /internal/embeddings/backfill` NestJS controller — EventBridge re-enabled (`src/internal/internal.controller.ts`)
- [x] On resume upload: fire-and-forget `storeChunks()` call (`src/intelligence/upload.controller.ts`)
- [x] RAG context injected into `IntelligenceService.chat()` system prompt (top-3 chunks, threshold 0.5)
- [x] Unit tests for `EmbeddingService` (`src/rag/embedding.service.spec.ts` — 5 tests)
- [x] Unit tests for `RagService` (`src/rag/rag.service.spec.ts` — 12 tests)
- [ ] Log similarity scores per query to CloudWatch (Phase 3 observability)
