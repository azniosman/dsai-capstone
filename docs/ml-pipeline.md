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

## Phase 4 (Complete — Active in Production)

### Hybrid Search — Reciprocal Rank Fusion (RRF)

`RagService.query()` now runs two retrieval branches in parallel and merges
results with **Reciprocal Rank Fusion** (k = 60):

```
User query
    │
    ├─► Semantic branch  — pgvector cosine similarity (existing)
    │       embedding <=> query_embedding, threshold ≥ 0.5
    │
    └─► Keyword branch   — PostgreSQL full-text search (new)
            search_vector @@ plainto_tsquery('english', query)
            ts_rank ordered, GIN index on tsvector generated column
    │
    ▼
RRF merge: score_i = Σ 1 / (60 + rank_j)
           chunks in both branches rank highest
    │
    ▼
Top-K results by RRF score → LLM context injection
```

**Graceful degradation**: If the keyword branch fails (e.g. `search_vector`
column not yet on a fresh DB), the service automatically falls back to
semantic-only results — no error is returned to the caller.

#### Bootstrap SQL (added to `src/main.ts`)

```sql
-- Generated column — maintained automatically by PostgreSQL on every write
ALTER TABLE document_chunk
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- GIN index for fast full-text lookups
CREATE INDEX IF NOT EXISTS document_chunk_search_vector_gin
  ON document_chunk USING gin(search_vector);
```

### User Feedback Signal

`POST /api/rag/feedback` accepts thumbs-up/down reactions for retrieved chunks:

```json
{ "chunk_id": 42, "query_text": "Python skills", "is_positive": true, "profile_id": 7 }
```

Feedback is stored in the `rag_feedback` table (`src/entities/rag-feedback.entity.ts`).
In **Phase 5**, signals will re-rank results: chunks with net-positive feedback
for a given profile receive a small RRF score boost.

### CloudWatch Observability Dashboard

Terraform resource `aws_cloudwatch_dashboard.rag_observability` creates a
4-widget dashboard in `${project}-${env}-rag-observability`:

| Widget | Metrics | Period |
|---|---|---|
| RAG Query Latency | `RagQueryLatencyMs` avg + max | 5 min |
| Chunks Returned | `RagChunksReturned` avg | 5 min |
| Similarity Scores | `RagSimilarityMax` + `RagSimilarityMean` avg | 5 min |
| Miss Count | `RagChunksReturned` sum (low = miss indicator) | 1 hour |

### Phase 4 Implementation Checklist

- [x] `search_vector` tsvector generated column + GIN index at bootstrap (`src/main.ts`)
- [x] `RagService.hybridQuery()` — semantic + keyword branches with RRF merge (`src/rag/rag.service.ts`)
- [x] Keyword branch try/catch — graceful degradation to semantic-only on column absence
- [x] `RagFeedback` entity — chunk FK, profile FK, queryText, isPositive (`src/entities/rag-feedback.entity.ts`)
- [x] `RagFeedbackDto` — validated DTO for `POST /api/rag/feedback` (`src/rag/dto/rag-feedback.dto.ts`)
- [x] `RagService.recordFeedback()` — persists feedback row via EntityManager
- [x] `POST /api/rag/feedback` controller endpoint (`src/rag/rag.controller.ts`)
- [x] `aws_cloudwatch_dashboard.rag_observability` — 4-widget Terraform resource
- [x] Unit tests: RRF ordering, keyword-only inclusion, keyword-fail fallback, topK cap, recordFeedback (6 new tests; 47 total)
- [x] Phase 5: apply feedback boost in RRF scoring (re-ranking pass after merge)

---

## Phase 5 (Complete — Active in Production)

### Feedback-Weighted Re-Ranking

After the RRF merge, `applyFeedbackBoost()` adjusts scores using stored
`rag_feedback` signals for the requesting profile:

```
RRF score (after merge)
    │
    ▼
SELECT chunk_id, SUM(CASE WHEN is_positive THEN 1 ELSE -1 END) AS net_score
FROM rag_feedback
WHERE chunk_id = ANY($chunk_ids) AND profile_id = $profile_id
    │
    ▼
rrfScore += α × tanh(net_score)   where α = 0.01
    │
    ▼
Re-sort → top-K returned
```

| Parameter | Value | Rationale |
|---|---|---|
| `α` (alpha) | `0.01` | Proportional to RRF range (~0.016–0.033); feedback is influential but not dominant |
| Normalisation | `tanh(net)` | Saturates at ±α regardless of vote count — prevents runaway boosts from many signals |
| Minimum votes to matter | ~1 | `tanh(1) ≈ 0.76` → first vote adds ~0.0076 to RRF score |

Non-fatal: if `rag_feedback` is unavailable (fresh DB, schema drift), original
RRF scores are left unchanged and a debug log is emitted.

### Parallel Branch Execution

Semantic and keyword branches now run **concurrently** via `Promise.all()`,
reducing hybrid search latency by ~40 % on typical PostgreSQL round-trip times
(one DB round trip instead of two sequential ones).

```typescript
const [semRows, kwRows] = await Promise.all([semPromise, kwPromise]);
//     ↑ pgvector cosine       ↑ tsvector full-text (catch → [] on missing column)
```

### Configurable Embedding Model

`EMBEDDING_MODEL` env var selects the ONNX model (both 384-dim, drop-in compatible):

| Value | Size | Quality |
|---|---|---|
| `Xenova/all-MiniLM-L6-v2` | ~23 MB | default, fast |
| `Xenova/all-MiniLM-L12-v2` | ~33 MB | higher quality |

Set in `.env` or Lambda environment variables. Validated in `env.validation.ts`.

### CloudWatch Logs Insights Saved Queries

Two `aws_cloudwatch_query_definition` resources in Terraform target the NestJS
Lambda log group and query raw EMF log lines:

| Query Name | Purpose |
|---|---|
| `RAG/LatencyAndMissRate` | Hourly: total queries, miss count, miss %, avg/P99 latency, avg similarity |
| `RAG/SimilarityDistribution` | Daily: P10/P50/P90 similarity, avg max/mean, query count |

Run from **CloudWatch → Logs Insights → Saved queries** or via AWS CLI:
```bash
aws logs start-query \
  --log-group-name /aws/lambda/<function-name> \
  --query-string "$(aws logs describe-query-definitions \
      --query-definition-name "SkillBridge/dev/RAG/LatencyAndMissRate" \
      --query 'queryDefinitions[0].queryString' --output text)" \
  --start-time $(date -d '24 hours ago' +%s) \
  --end-time $(date +%s)
```

### Phase 5 Implementation Checklist

- [x] `EMBEDDING_MODEL` env var in `embedding.service.ts` + `env.validation.ts`
- [x] `hybridQuery()` branches run concurrently via `Promise.all()`
- [x] `applyFeedbackBoost()` — queries `rag_feedback`, applies `α × tanh(net)` boost
- [x] Feedback boost called only when `profileId` is provided (authenticated users)
- [x] Feedback query is non-fatal: errors silently degrade to pre-boost scores
- [x] `aws_cloudwatch_query_definition.rag_latency_and_miss_rate` Terraform resource
- [x] `aws_cloudwatch_query_definition.rag_similarity_distribution` Terraform resource
- [x] Unit tests: feedback promotion, demotion, profileId-absent skip, feedback-throws fallback (4 new; 55 total)

---

## Phase 6 (Planned)

- ONNX model upgrade: `all-MiniLM-L12-v2` for higher recall on technical queries
- Hybrid CTE: single SQL query combining HNSW + GIN via FULL OUTER JOIN (one round trip)
- Cross-encoder re-ranking: lightweight ML re-ranker on top-20 RRF candidates
- Streaming RAG: inject retrieved context progressively into SSE chat responses
