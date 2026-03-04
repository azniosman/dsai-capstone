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
| Career chat | LLM with profile context + RAG injection | `IntelligenceService.chat()` |
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

## Phase 2 (Complete — Active in Production)

### Embedding Pipeline

**Model**: `all-MiniLM-L6-v2` (384-dim, sentence-transformers)
**Library**: `@xenova/transformers` (Node.js ONNX runtime — no Python needed)
**Vector store**: pgvector (extension installed on PostgreSQL 16)

```
Text (resume chunk / skill / query)
    │
    ▼
EmbeddingService.embed(text) → float32[384]  (all-MiniLM-L6-v2)
    │
    ▼
DocumentChunk entity
  .embedding  pgvector column  vector(384)
    │
    ▼
CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)
```

### Document Chunking

- Chunk size: ~1500 chars (~375 tokens for English)
- Overlap: 200 chars — snapped to nearest sentence boundary
- Metadata per chunk: `profile_id`, `source_type`, `chunk_index`, `created_at`, `content_hash`
- Idempotency: SHA-256 hash of content (64-char hex) — skip re-embedding if hash matches

### RAG Retrieval Flow

```
User query
    │
    ▼
EmbeddingService.embed(query)
    │
    ▼
pgvector cosine similarity search (top-3, threshold ≥ 0.5)
    │
    ▼
Chunks injected into LLM system prompt:
  [SYSTEM INSTRUCTIONS]
  [RETRIEVED CONTEXT — up to 3 chunks with similarity scores]
  [USER QUESTION]
    │
    ▼
LLM provider chain (Groq → Claude → Gemini)
```

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

---

## Phase 3 (Complete — Active in Production)

### Observability — CloudWatch EMF Metrics

Every `RagService.query()` call emits a **CloudWatch Embedded Metric Format (EMF)** line
to stdout. Lambda's CloudWatch Logs agent automatically extracts these into custom metrics
without extra IAM permissions or SDK calls.

**Namespace**: `SkillBridge/RAG`
**Dimension**: `Service = RagService`

| Metric | Unit | Description |
|---|---|---|
| `RagQueryLatencyMs` | Milliseconds | Wall-clock time from embed start to results returned |
| `RagChunksReturned` | Count | Number of chunks above similarity threshold (0 = miss) |
| `RagSimilarityMax` | None | Highest cosine similarity score in result set (0–1) |
| `RagSimilarityMean` | None | Mean cosine similarity across returned chunks (0–1) |

Zero-chunk (miss) queries also emit metrics with `RagChunksReturned = 0` and
`RagSimilarityMax = RagSimilarityMean = 0` — including the early-exit path when
the embedding model is unavailable.

### CloudWatch Alarm

One alarm added (`terraform/modules/eventbridge/main.tf`):

| Alarm | Condition | Action |
|---|---|---|
| `rag-latency-high` | `RagQueryLatencyMs` max > 8000 ms for 2 × 5-min periods | SNS alert email |

### Phase 3 Implementation Checklist

- [x] `emitEMF()` utility (`src/common/utils/metrics.util.ts`) — EMF helper, no extra SDK
- [x] `RagService.emitQueryMetrics()` private method — called on every `query()` exit path
- [x] `RagQueryLatencyMs`, `RagChunksReturned`, `RagSimilarityMax`, `RagSimilarityMean` emitted
- [x] CloudWatch alarm `rag-latency-high` in `terraform/modules/eventbridge/main.tf`
- [x] Unit tests for EMF emission (`src/rag/rag.service.spec.ts` — 2 new tests, 41 total)
- [ ] Log similarity scores dashboard in CloudWatch (Phase 4 observability)

---

## Phase 4 (Planned)

- Hybrid search: keyword (tsvector) + semantic (pgvector) re-ranked with Reciprocal Rank Fusion
- User feedback signal: thumbs-up/down on chat replies → reinforces chunk relevance
- CloudWatch Logs Insights dashboard for RAG miss-rate trend
- Similarity score dashboard in CloudWatch
