# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SkillBridge — Job Recommendation & Skill Gap Analysis System for SCTP learners and career-switchers in Singapore.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion + Three.js
- **Backend**: NestJS 10 + TypeScript + MikroORM + Passport.js (replacing Python FastAPI — migration in progress)
- **AI/ML**: Sentence Transformers (`all-MiniLM-L6-v2`), FAISS, Google Gemini, AWS Bedrock (Claude 3.5 Sonnet) — `IntelligenceModule` wired via `LlmService`; fallback chain: Gemini → Bedrock → 503
- **Database**: PostgreSQL 16 + pgvector
- **Automation**: n8n workflows
- **Deployment (capstone)**: Docker Compose locally; AWS Lambda + Aurora Serverless v2 + S3/CloudFront via Terraform
- **Deployment (enterprise roadmap)**: AWS ECS Fargate + RDS + OpenSearch

## Build & Run Commands

```bash
# Full stack (Docker) — starts db (:5432), backend (:8000), frontend (:3000), n8n (:5678)
docker compose up

# NestJS backend (local dev)
cd nestjs-backend
npm install
npm run start:dev     # watch mode, runs on :8000
npm run build         # compile to dist/
npm run lint          # ESLint

# NestJS backend tests
cd nestjs-backend
npm run test          # unit tests (Jest)
npm run test:e2e      # e2e tests
npm run test:cov      # coverage report

# Frontend development
cd frontend
npm install
npm run dev           # runs on :3000
npm run lint          # ESLint
npm run build         # production build (must pass before PR)

# Database seeding (via MikroORM seeder)
cd nestjs-backend
npm run seed          # if wired; or via MikroORM CLI: npx mikro-orm seeder:run

# AWS deployment scripts
bash scripts/build_and_push.sh      # builds Docker images and pushes to ECR
```

## Environment Configuration

Backend env vars (set in `.env` at project root; see `.env.example`):

- `DATABASE_URL` — full Postgres connection string (overrides individual vars)
- `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME` — individual DB fields (defaults: `capstone`/`changeme`/`localhost`/`5432`/`capstone`)
- `JWT_SECRET` — JWT signing key
- `GEMINI_API_KEY`, `GEMINI_MODEL` — optional, for LLM features (default: `gemini-2.0-flash`)
- `AWS_REGION` — AWS region (default `ap-southeast-1`)
- `BEDROCK_MODEL_ID` — Bedrock model (must use cross-region inference profile ID, not direct model ID)
- `NEXT_PUBLIC_API_URL` — frontend env var pointing to backend (default `http://localhost:8000`)
- `CORS_ALLOWED_ORIGINS` — JSON array of allowed origins (default `["http://localhost:3000","http://localhost:5173"]`)
- `SSG_CLIENT_ID`, `SSG_CLIENT_SECRET` — optional; SkillsFuture/WSG API credentials. If absent, SSG module falls back to seeded SCTP data
- `SSG_API_BASE_URL`, `SSG_TOKEN_URL` — SSG API endpoints (optional)
- `SSG_CACHE_TTL_SECONDS` — how long to cache SSG responses in PostgreSQL (optional)
- `INTERNAL_AUTOMATION_TOKEN` — shared secret validated by `InternalTokenGuard`; injected from Secrets Manager in production; required for automation Lambdas to call `/internal/*` endpoints

## Architecture

### Backend (NestJS — `nestjs-backend/`)

**Entry point**: `src/main.ts` — bootstraps NestJS app on port 8000.
**ORM config**: `src/mikro-orm.config.ts` — MikroORM with PostgreSQL driver; entities at `src/entities/*.entity.ts`.
**App config/validation**: `src/common/config/env.validation.ts` — class-validator schema for env vars.

**Entities** (`src/entities/`): `user.entity.ts`, `user-profile.entity.ts`, `skill.entity.ts`, `job-role.entity.ts`, `sctp-course.entity.ts`, `skill-progress.entity.ts`, `market-insight.entity.ts`, `profile-snapshot.entity.ts`, `tenant.entity.ts`, `ssg-cache.entity.ts`

**Modules** (`src/`):
- `auth/` — Passport.js JWT + Local strategies; `AuthController`, `AuthService`
- `users/` — user CRUD
- `profile/` — user profile management
- `skills/` — skill taxonomy + user skills
- `intelligence/` — AI features: `chat()`, `getRecommendations()`, `getSkillGap()`, `interview()`, `rewriteResume()`; wired via `LlmService`
- `intelligence/upload.controller.ts` — resume upload + parsing
- `upskilling/` — roadmap and course pathways
- `roles/` — job role listing
- `courses/` — SCTP course catalog
- `domain/` — Singapore labor market insights; also owns `GET /api/dashboard/summary`
- `ssg/` — SkillsFuture/WSG API integration with three-tier fallback: PostgreSQL cache → live SSG API → seeded SCTPCourse rows
- `internal/` — `InternalController` + `InternalModule`; automation endpoints invoked exclusively via Lambda Invoke API, never via public API Gateway. Guarded by `InternalTokenGuard` (`common/guards/`) which validates `X-Internal-Token` header against `INTERNAL_AUTOMATION_TOKEN`. `GET /internal/health` has no auth guard (used by warmup ping).
- `common/` — shared config, filters, interceptors, utils (`resume-parser.util.ts`)
- `seeders/` — MikroORM seed data

**Auth flow**: `POST /auth/login` accepts JSON `{ username, password }` via Local strategy → returns JWT. Token attached as `Authorization: Bearer <token>`. JWT strategy validates subsequent requests.

**LLM wiring**: `LlmService` (`intelligence/llm.service.ts`) handles Gemini/Bedrock dispatch. Fallback chain: Gemini API → Bedrock Claude 3.5 Sonnet → HTTP 503. The `resume-rewriter` endpoint (`POST /api/resume-rewriter`) also lives in `IntelligenceController`.

### Frontend (`frontend/`)

- `app/` — Next.js App Router pages by feature (recommendations, skill-gap, roadmap, jd-match, chat, interview, market, compare, courses, progress, projects, peers, dashboard, account)
- `components/` — organized by domain:
  - `ui/` — shadcn primitives + extended SkillBridge components (`skill-radar.tsx`, `match-score-bar.tsx`, `skill-chip.tsx`, `skeleton-card.tsx`, `empty-state.tsx`, `AppModal.tsx`, `chart-card.tsx`)
  - `layout/` — `app-shell.tsx`, `sidebar-nav.tsx`, `page-header.tsx`, `error-boundary.tsx`, `page-transition.tsx`
  - `landing/` — Three.js canvas components: `bg-canvas.tsx` (flow-field, loaded via `dynamic()`), `neuron-canvas.tsx`
  - `modals/` — feature modals (`AIChatModal.tsx`, `BuildProfileModal.tsx`, `CareerAnalysisModal.tsx`, `ProfileModal.tsx`, `ResumeUploadModal.tsx`, `ResumePreviewModal.tsx`, `SkillGapModal.tsx`)
  - `profile-builder/` — multi-step wizard (`StepUploadResume`, `StepPersonalInfo`, `StepSkills`, `StepReview`)
  - `profile/` — profile form
  - `chat/` — `ChatCoach.tsx` embeddable chat panel
  - `roadmap/`, `skill-gap/`, `voice-coach/` — feature-specific components
- `store/` — Zustand stores:
  - `modalStore.ts` — global modal open/close state
  - `profileBuilderStore.ts` — profile wizard state (step, resume file, parsed data, personal info, skills)
- `providers/` — React providers:
  - `ModalProvider.tsx` — renders modal portals based on `modalStore`
  - `QueryProvider.tsx` — React Query client wrapper
- `lib/api-client.ts` — Axios instance; JWT auto-attach + refresh (shared Promise prevents race conditions); redirects to `/login` on 401
- `lib/api.ts` — typed service layer; always use these functions in pages, not direct axios calls
- `lib/services.ts` — higher-level service helpers
- `lib/websocket.ts` — WebSocket client for voice coaching

**Extended component props (non-obvious):**
- `SkillRadar` (`components/ui/skill-radar.tsx`) — accepts optional `metrics?: SkillRadarMetrics`. When provided, renders KPI summary, animated score breakdown bars (0.55/0.25/0.20 formula), skill tally, AI rationale.
- `GapTable` (`components/gap-table.tsx` or `components/skill-gap/`) — accepts `hoveredSkill?: string | null` and `onHoverSkill?` for bidirectional hover sync with Recharts bar charts.
- Three.js canvases (`landing/`) — always load via `dynamic(() => import(...), { ssr: false })`. They crash on SSR.

**State pattern**: use `useProfileBuilderStore()` for profile wizard state; use `useModalStore()` to open/close modals. Don't manage modal open state locally in components.

### Data

- `data/seed/` — `skills_taxonomy.json` (~150+ skills), `job_roles.json` (SGD salary benchmarks), `sctp_courses.json` (SkillsFuture SCTP courses with subsidy fields)
- NestJS seeders in `nestjs-backend/src/seeders/` consume this data.

### Automation Lambdas (`lambdas/automation/`)

Python Lambda functions triggered by EventBridge Scheduler. All reuse the backend Docker image via a CMD override. They invoke `/internal/*` NestJS endpoints via Lambda Invoke API (not HTTP), passing `X-Internal-Token` fetched from Secrets Manager.

- `base_automation.py` — shared `call_internal_endpoint()`, `emit_metric()`, `get_internal_token()` (token cached in module scope across warm invocations)
- `ssg_sync.py` — SSG course + job role sync (daily 01:00 / 01:30 UTC)
- `recommendation_refresh.py` — recommendation pre-compute + LLM rationale pre-gen (daily 02:00 / 02:30 UTC; Phase 2 stubs)
- `cache_cleanup.py` — bulk-delete expired `ssg_cache` rows (daily 03:00 UTC)
- `market_insights.py` — aggregate market insight metrics (daily 04:00 UTC)
- `embedding_backfill.py` — Titan embedding backfill (every 6 hours; Phase 2 stub)
- `lambda_warmup.py` — warm-up ping to `GET /internal/health` (every 5 minutes, optional)

### Infrastructure

Terraform modules in `terraform/modules/`: `vpc`, `database` (Aurora Serverless v2 + pgvector), `backend` (Lambda + API Gateway), `lambda_backend`, `api_gateway`, `frontend` (S3 + CloudFront), `ecr`, `ecs`, `rds`, `iam`, `opensearch`, `sagemaker`, `websocket`, `eventbridge` (automation Lambdas + 8 EventBridge Scheduler rules + SQS DLQ + SNS alerts + 6 CloudWatch alarms).

CI/CD: `.github/workflows/deploy-serverless.yml` — static IAM keys from GitHub environment secrets (`dev`/`prod`), targets `us-east-1`.

### n8n Workflows

Automation in `n8n/workflows/` (port 5678): `market_simulation.json`, `resume_ingestion.json`, `analysis_notification.json`.

## Serverless AWS Deployment

```bash
# Quick redeploy (image + frontend only — ~5 min; use after code-only changes)
gh workflow run deploy-serverless.yml -f environment=dev -f skip_terraform=true

# Full deploy (clean-slate teardown + Terraform apply — ~35 min; required for infra changes)
gh workflow run deploy-serverless.yml -f environment=dev

# Get current API endpoint
cd terraform && terraform output -raw api_endpoint

# Pause NAT Gateway between demos (~$32/month)
terraform destroy -target='module.vpc.aws_nat_gateway.main' -target='module.vpc.aws_eip.nat'
```

**Full deploy strategy**: deletes all non-ECR resources before `terraform apply`, so **API Gateway URL and S3 bucket name change** on every full deploy. `skip_terraform=true` preserves existing URLs.

## Lambda Deployment Gotchas

- **`update-function-code` is not instant**: Warm containers may serve old code for 1–2 minutes after update. Send a few requests to exhaust the warm pool before testing.

- **Docker buildx + Lambda**: Always pass `--provenance=false` to `docker buildx build`. Without it, BuildKit adds SLSA attestations creating an OCI manifest list, which Lambda rejects with `InvalidParameterValueException: image manifest ... not supported`.

- **`skip_terraform=true` Lambda update**: The workflow explicitly calls `aws lambda update-function-code` for all Lambda functions. Without this, the new ECR image is pushed but Lambda keeps the old one.

- **Bedrock requires console opt-in**: AWS accounts must enable model access in the Bedrock console (Model access → request Claude 3.5 Sonnet v2). IAM permissions alone are insufficient — a missing opt-in returns `ValidationException: Operation not allowed`.

- **`trailingSlash: true` breaks S3 routing**: Never set `trailingSlash: true` in `next.config.ts` when `NEXT_OUTPUT=export`. It nests output as `login/index.html` instead of flat `login.html`, breaking the CloudFront routing script.

- **`/internal/*` endpoints are Lambda Invoke only**: Do NOT add API Gateway routes for them. The `InternalTokenGuard` is a second layer of defence, not the primary one — the primary guard is that they have no public route. The automation Lambdas call `base_automation.call_internal_endpoint()` which constructs a Lambda Invoke payload mimicking an API Gateway event. The NestJS Lambda handler processes it identically to a real HTTP request.

- **`POST /api/chat` returns SSE**: Response is `text/event-stream`. `res.data.reply` is always `undefined`. Parse as:
  ```typescript
  if (typeof res.data === "string") {
    const lines = res.data.split("\n");
    const reply = lines.filter((l) => !l.startsWith("[ENGINE:")).join("\n").trim();
  }
  ```

## Key Design Decisions

- **Hybrid scoring**: `0.55 × content_similarity + 0.25 × rule_match + 0.20 × career_switcher_bonus`
- **Skill levels**: 0 (missing), 0.5 (partial), 1.0 (strong)
- **FAISS in-memory** for vector similarity (rebuilt on startup; no external vector store needed)
- **LLM fallback chain**: Gemini API (primary) → AWS Bedrock Claude 3.5 Sonnet (fallback) → HTTP 503
- **Auth is optional**: core features work without login
- **Multi-tenancy**: all entities have `tenant` relation; a `Global` tenant is auto-created on startup
- **Recommendation cache**: in-memory TTL cache (300s)

## Further Reference

- Architecture deep-dive: `docs/architecture.md`
- ML pipeline details: `docs/ml-pipeline.md`
- API reference: `docs/api-reference.md`
- Local setup troubleshooting: `docs/local-setup.md`

## API Endpoints

| Method | Path                          | Description                           |
| ------ | ----------------------------- | ------------------------------------- |
| POST   | /api/auth/register            | User registration                     |
| POST   | /api/auth/login               | User login (returns JWT)              |
| GET    | /api/auth/me                  | Current user info                     |
| POST   | /api/profile                  | Create user profile                   |
| POST   | /api/upload-resume            | Upload PDF/DOCX resume                |
| POST   | /api/recommend                | Get job recommendations               |
| GET    | /api/skill-gap/{id}           | Skill gap analysis                    |
| GET    | /api/upskilling/{id}          | Upskilling roadmap                    |
| POST   | /api/jd-match                 | Match profile against job description |
| POST   | /api/chat                     | Career coach chatbot (SSE response)   |
| POST   | /api/interview                | Mock interview simulator              |
| GET    | /api/market-insights          | Singapore labor market data           |
| POST   | /api/compare-roles            | Multi-role comparison                 |
| GET    | /api/roles                    | List all roles                        |
| GET    | /api/peer-comparison/{id}     | Anonymized peer comparison            |
| GET    | /api/project-suggestions/{id} | Portfolio project ideas               |
| POST   | /api/progress                 | Record skill progress                 |
| GET    | /api/progress/{id}            | Get progress dashboard                |
| GET    | /api/progress/{id}/timeline   | Progress timeline data                |
| GET    | /api/export/roadmap/{id}      | Export roadmap as PDF                 |
| GET    | /api/courses                  | List SCTP courses                     |
| POST   | /api/calculate-subsidy        | Calculate SkillsFuture subsidy        |
| POST   | /api/rag/query                | RAG-based document retrieval          |
| POST   | /api/gap-analysis             | Async skill gap analysis              |
| POST   | /api/voice                    | Voice coaching session                |
| GET    | /api/dashboard/summary        | Authenticated user's dashboard KPIs   |
| POST   | /api/resume-rewriter          | Rewrite a resume bullet for a role    |
| GET    | /api/ssg/courses/search       | Search SkillsFuture courses (paginated; falls back to seeded data) |
| GET    | /api/ssg/courses/:ref         | Get single SSG course by reference number |
| GET    | /api/ssg/job-roles            | List WSG SkillsFramework job roles    |
| POST   | /api/ssg/recommendations      | Personalised SSG courses by skill overlap |

**Internal automation endpoints** (Lambda Invoke only — not on API Gateway; require `X-Internal-Token` header except health):

| Method | Path                                      | Description                                |
| ------ | ----------------------------------------- | ------------------------------------------ |
| GET    | /internal/health                          | Warmup health check (no auth)              |
| POST   | /internal/sync/ssg/courses                | SSG course cache population                |
| POST   | /internal/sync/ssg/jobroles               | SSG job role cache population              |
| POST   | /internal/cache/cleanup                   | Bulk-delete expired ssg_cache rows         |
| POST   | /internal/recommendations/precompute      | Pre-compute recommendation scores (Phase 2)|
| POST   | /internal/recommendations/rationale-pregen| Pre-gen LLM rationale (Phase 2)           |
| POST   | /internal/embeddings/backfill             | Titan embedding backfill (Phase 2)         |
| POST   | /internal/analytics/aggregate             | Pre-compute market insight metrics         |
