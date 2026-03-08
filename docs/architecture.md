# SkillBridge — System Architecture

## Overview

SkillBridge is an AI-powered job recommendation and skill gap analysis platform for SCTP learners and career-switchers in Singapore. The production stack runs fully serverless on AWS; local development uses Docker Compose.

---

## High-Level Topology

```
┌─────────────────────────────────────────────────────────┐
│  Browser / Mobile                                        │
│  Next.js 16 (App Router) — Static Export (S3)           │
│  React 19 · Tailwind 4 · shadcn/ui · Recharts · Three.js│
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS  (REST + SSE)
                     ▼
┌─────────────────────────────────────────────────────────┐
│  CloudFront CDN                                          │
│  ├── /api/*  →  API Gateway (HTTP API)                  │
│  └── /*      →  S3 static export bucket                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  API Gateway  (HTTP API, us-east-1)                      │
│  ├── /api/*      → Lambda (NestJS backend)              │
│  └── /internal/* — NO public route (Lambda Invoke only) │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  AWS Lambda  (containerised NestJS, 3008 MB RAM)         │
│                                                          │
│  Modules:                                                │
│  ├── AuthModule        JWT + Passport (local + optional) │
│  ├── IntelligenceModule chat · recommend · skill-gap ·   │
│  │                     interview · resume-rewriter        │
│  │   └── LlmService    Groq → Claude → Gemini chain      │
│  ├── RagModule         EmbeddingService (ONNX bge-small) │
│  │                     RagService (pgvector + tsvector)   │
│  │                     CrossEncoderService (opt-in)       │
│  ├── SsgModule         SSG/WSG API + 3-tier fallback      │
│  ├── DomainModule      market insights · dashboard KPIs  │
│  ├── ProfileModule     user profiles · snapshots          │
│  ├── UpskillingModule  roadmap · course pathways          │
│  ├── CopilotModule     multi-turn AI career assistant     │
│  ├── InternalModule    automation endpoints (no pub route)│
│  └── CommonModule      LogBus · AuditLog · SystemLog      │
│                                                          │
│  Cold-start bootstrap:                                   │
│  ├── orm.updateSchema()   additive-only schema sync      │
│  ├── tsvector GIN index creation                         │
│  └── ONNX model loaded from /app/.cache/huggingface      │
└──────┬──────────────────────────────────────────────────┘
       │
       ├──────────────────────────────┐
       ▼                              ▼
┌─────────────────────┐   ┌──────────────────────┐
│  Aurora Serverless  │   │  S3 Buckets          │
│  v2 (PostgreSQL 16  │   │  ├── resume uploads  │
│  + pgvector)        │   │  └── frontend export │
│                     │   └──────────────────────┘
│  Core tables:       │
│  user               │
│  user_profile       │
│  skill              │
│  job_role           │
│  sctp_course        │
│  skill_progress     │
│  profile_snapshot   │
│  document_chunk     │  ← RAG vector store (384-dim HNSW)
│  rag_feedback       │  ← thumbs up/down re-ranking signals
│  market_insight     │
│  ssg_cache          │
│  tenant             │
│  system_log         │  ← structured audit + app logs
└─────────────────────┘
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend runtime | NestJS 10 + TypeScript on Lambda | Type safety, DI, modular structure; containerised for consistent cold starts |
| Hybrid scoring | 0.55 content + 0.25 rule + 0.20 career-switcher bonus | Balances skill similarity with eligibility and equity |
| Vector search | pgvector HNSW (in Aurora) | No separate vector store; shares ACID guarantees with relational data |
| Full-text search | PostgreSQL tsvector GIN + RRF merge | Hybrid lexical + semantic retrieval in a single SQL CTE |
| LLM chain | Groq → Claude → Gemini (configurable) | Cost-effective primary; fallback chain avoids hard dependency on one provider |
| Embedding model | Xenova/bge-small-en-v1.5 (ONNX, 384-dim) | Baked into Docker image; no internet access required at Lambda runtime |
| Auth | JWT (stateless) via Authorization header | No cookie dependency; `OptionalJwtAuthGuard` for public endpoints defaulting to Global tenant |
| Schema migrations | `updateSchema()` on cold start (additive-only) | No migration runner needed; destructive changes go in versioned migration files |
| Multi-tenancy | `tenant_id` FK on all entities | Single DB instance; Global tenant (ID 1) for unauthenticated requests |
| Internal automation | Lambda Invoke API only (no API Gateway route) | `/internal/*` endpoints are unreachable from the public internet by design |

---

## Request Flow — Recommendations

```
POST /api/recommend
  → OptionalJwtAuthGuard  (unauthenticated → tenant 1)
  → RecommendationService.getRecommendations()
      → check in-memory TTL cache (300s)
      → fetch UserProfile + Skills from Aurora
      → for each JobRole:
          content_similarity  = cosine(embed(user_skills), embed(role_skills))
          rule_score          = education + experience match
          career_switcher     = bonus if switching domain
          hybrid_score        = 0.55 × content + 0.25 × rule + 0.20 × career
      → sort by hybrid_score DESC
      → LlmService.generateRationale()  [Groq → Claude → Gemini]
      → cache result
      → return top-N with rationale
```

## Request Flow — RAG Query

```
POST /api/rag/query
  → EmbeddingService.embed(query)
      → Xenova/bge-small-en-v1.5 (ONNX, allowRemoteModels=false)
      → 384-dim float32 vector
  → RagService.query()
      → SQL CTE:
            pgvector HNSW cosine search  (semantic)
            FULL OUTER JOIN
            tsvector GIN keyword search  (lexical)
            → RRF merge  (k=60)
      → applyFeedbackBoost()
            rrfScore += 0.01 × tanh(net_votes)
            authenticated users only; tanh normalises vote counts
      → CrossEncoderService.rerank()  [opt-in; ms-marco-MiniLM-L-6-v2]
      → slice(0, topK)
  → return ranked DocumentChunks
```

## Request Flow — Skill Gap Analysis

```
GET /api/skill-gap/:profileId
  → IntelligenceService.getSkillGap()
      → RecommendationService.getRecommendations(top_n=3)
      → for each recommended role:
            gap = role.requiredSkills − user.skills
            gap_severity = missing | partial | present
      → ProfileSnapshotService.maybeSnapshot()
            only if last snapshot > 24h old (debounced)
      → LlmService.generateGapNarrative()
      → return gaps[] + trendData + estimatedTimeToClose
```

---

## LLM Dispatch Chain

```
LlmService.dispatch(prompt, options)
  │
  ├─ PRIMARY_LLM=groq    →  Groq API  (llama-3.3-70b-versatile)
  │       ↓ on error / timeout
  ├─ SECONDARY_LLM=claude →  Anthropic API  (claude-sonnet-4-6)
  │       ↓ on error / timeout
  ├─ TERTIARY_LLM=gemini  →  Google AI  (gemini-2.0-flash)
  │       ↓ all failed
  └─ HTTP 503  (all providers unavailable)

Configuration via env vars: PRIMARY_LLM | SECONDARY_LLM | TERTIARY_LLM
Valid values: groq | claude | gemini
Unconfigured providers are skipped silently.
```

---

## Automation Lambdas

All automation Lambdas reuse the backend Docker image via a CMD override. They call `/internal/*` NestJS endpoints through Lambda Invoke API (not HTTP), passing `X-Internal-Token` from Secrets Manager.

```
EventBridge Scheduler
  ├── 01:00 UTC  daily    ssg_sync.py             SSG course cache sync
  ├── 01:30 UTC  daily    ssg_sync.py             WSG job role cache sync
  ├── 02:00 UTC  daily    recommendation_refresh.py  pre-compute scores (Phase 2)
  ├── 03:00 UTC  daily    cache_cleanup.py        purge expired ssg_cache rows
  ├── 04:00 UTC  daily    market_insights.py      aggregate market metrics
  ├── every 6h            embedding_backfill.py   ONNX embedding backfill (Phase 2)
  └── every 5min          lambda_warmup.py        GET /internal/health  (keepwarm)

Internal endpoint auth:
  InternalTokenGuard validates X-Internal-Token header
  Token fetched from Secrets Manager; cached in module scope across warm invocations
  GET /internal/health has no auth guard (used for warmup ping)
```

---

## Logging Architecture

```
NestJS services
  └── this.logBus.emit(LogEntry)
        │
        ├── In-memory ring buffer (max 500 entries, FIFO)
        ├── RxJS Subject (stream$) → SSE subscribers
        └── DB queue → batch flush every 5s → system_log table

Frontend (app/logs/page.tsx)
  ├── SSE stream   GET /api/logs/stream     (primary; real-time)
  └── JSON polling GET /api/logs/recent?n=  (fallback; Lambda-resilient)
        client-side ring buffer (500 entries)

LogEntry shape:
  { timestamp, type, component, message, traceId?, meta? }
  type: RAG | LLM | AWS | SYSTEM | ERROR | INFO | WARN
  traceId: pulled from AsyncLocalStorage (nestjs-cls) per request
```

---

## Frontend Architecture

```
frontend/
  app/                    Next.js App Router pages
    dashboard/            Career health + KPI tiles + opportunities feed
    recommendations/      Two-panel: job list + detail with AlignmentGauge
    skill-gap/            HexRadar + PhaseTimeline
    roadmap/              Multi-phase career roadmap
    courses/              SCTP course catalog + filter bar
    chat/                 Full-page career coach chat
    interview/            AI mock interview
    market/               Singapore labor market insights
    compare/              Multi-role comparison
    progress/             Skill progress tracker
    logs/                 Live log viewer + pipeline canvas

  components/
    ui/                   shadcn primitives + SkillBridge extensions
    layout/               AppShell · SidebarNav · PageHeader
    landing/              Three.js canvases (SSR-disabled via dynamic())
    modals/               Feature modals (AIChatModal, SkillGapModal, …)
    profile-builder/      Multi-step onboarding wizard

  lib/
    api-client.ts         Axios instance; JWT auto-attach + 401 refresh
    api.ts                Typed service layer (always use this, not raw axios)

  store/
    modalStore.ts         Global modal open/close state (Zustand)
    profileBuilderStore.ts Wizard step state (Zustand)
```

---

## Infrastructure (Terraform)

```
terraform/modules/
  vpc/                    VPC + private/public subnets + NAT Gateway
  database/               Aurora Serverless v2 + pgvector extension
  backend/                Lambda function + ECR repo
  lambda_backend/         Lambda IAM role + environment config
  api_gateway/            HTTP API + routes + stage
  frontend/               S3 bucket + CloudFront distribution
  ecr/                    Container registry
  iam/                    Roles and policies
  eventbridge/            8 EventBridge Scheduler rules + SQS DLQ + SNS alerts
                          6 CloudWatch alarms
  sagemaker/              (stubbed — Phase 2)
  opensearch/             (stubbed — Phase 2)
  websocket/              (stubbed — Phase 2)
```

---

## CI/CD Pipeline

```
.github/workflows/deploy-serverless.yml
  │
  ├── Inputs:
  │     environment         dev | prod
  │     skip_terraform      bool  (code-only redeploy ~5 min)
  │     enable_cloudfront   bool
  │     enable_custom_domain bool
  │     custom_domain       string  e.g. sklbr.co
  │
  ├── Steps:
  │     1. docker buildx build --provenance=false  (SLSA attestation breaks Lambda)
  │     2. docker push → ECR
  │     3. next build (NEXT_OUTPUT=export) → S3 sync
  │     4. terraform apply  OR  aws lambda update-function-code
  │     5. CloudFront invalidation
  │
  └── Credentials: static IAM keys from GitHub environment secrets (dev / prod)
                   targeting us-east-1
```

---

## Local Development

```
docker compose up
  ├── PostgreSQL 16 + pgvector    :5432
  ├── NestJS backend              :8000
  ├── Next.js frontend            :3000
  └── n8n workflows               :5678

Environment: .env at project root (see .env.example)
Seeding:     cd nestjs-backend && npx mikro-orm seeder:run
Full script: bash scripts/deploy.sh  (build + start + smoke test)
```

---

## Security Boundaries

```
Public internet
  └── CloudFront → API Gateway → Lambda
        ├── /api/*         JWT (optional or required per endpoint)
        └── All other paths → 404 / S3 static

Private (no public route)
  └── /internal/*   Lambda Invoke only
        └── InternalTokenGuard (X-Internal-Token header)
        └── GET /internal/health  — no auth (warmup only)

Database
  └── Aurora in private subnet — no public endpoint
        Lambda accesses via VPC security group

Secrets
  └── AWS Secrets Manager  /skillbridge/{env}/{key}
        INTERNAL_AUTOMATION_TOKEN cached per Lambda instance
```
