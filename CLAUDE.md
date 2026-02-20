# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SkillBridge — Job Recommendation & Skill Gap Analysis System for SCTP learners and career-switchers in Singapore.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy 2 + Pydantic + Mangum (Lambda adapter)
- **AI/ML**: Sentence Transformers (`all-MiniLM-L6-v2`), spaCy, FAISS, Google Gemini, AWS Bedrock (Claude 3.5 Sonnet)
- **Database**: PostgreSQL 16
- **Automation**: n8n workflows
- **Deployment (capstone)**: Docker Compose locally; AWS Lambda + Aurora Serverless v2 + S3/CloudFront via Terraform
- **Deployment (enterprise roadmap)**: AWS ECS Fargate + RDS + OpenSearch

## Serverless AWS Deployment

The CI/CD workflow is at `.github/workflows/deploy-serverless.yml` — trigger via GitHub Actions → "Deploy Serverless Stack" → Run workflow.

```bash
# Quick redeploy (image + frontend only, no infra teardown — ~5 min)
# Use after backend-only code changes. Also calls update-function-code for all 6 Lambda functions.
gh workflow run deploy-serverless.yml -f environment=dev -f skip_terraform=true

# Full deploy (clean-slate teardown + Terraform apply — ~35 min)
# Required for infra changes (memory, VPC, DB, API Gateway, etc.)
gh workflow run deploy-serverless.yml -f environment=dev

# Get current API endpoint after deploy
cd terraform && terraform output -raw api_endpoint

# Run integration tests against live AWS (full_test.py has hardcoded localhost:8000)
sed 's|http://localhost:8000|https://<api_endpoint>|' scripts/full_test.py | python3
```

The serverless Terraform stack (`terraform/`) targets:
- **Lambda** (container image from ECR, 3008 MB) + **API Gateway HTTP API**
- **Aurora Serverless v2** (private subnet, ~$43/month)
- **S3 + CloudFront** with OAC (frontend)
- **Optional OpenSearch** (set `enable_opensearch=true`, adds ~$26/month)

Cost tip: `terraform destroy -target='module.vpc.aws_nat_gateway.main' -target='module.vpc.aws_eip.nat'` to pause NAT Gateway ($32/month) between demos.

**Full deploy strategy**: The clean-slate step deletes all non-ECR AWS resources before `terraform apply` recreates them. This means **API Gateway URL and S3 bucket name change** on every full deploy. Always read outputs after deploy. `skip_terraform=true` preserves existing infra and URLs.

## Build & Run Commands

```bash
# Full stack (Docker) — starts db, backend, frontend, n8n
docker compose up

# Docker deployment helper (wraps docker compose up -d --build)
bash scripts/deploy.sh

# Backend development (local)
cd backend
pip install -r requirements.txt          # or: conda create -n skillbridge python=3.11 -y && conda activate skillbridge
python -m spacy download en_core_web_sm   # required for NLP features
uvicorn app.main:app --reload             # runs on :8000

# Backend tests (uses in-memory SQLite, no DB needed)
cd backend && pytest
cd backend && pytest tests/test_recommender.py -v        # single file
cd backend && pytest tests/test_recommender.py::test_name -v  # single test

# End-to-end feature tests (requires running backend)
python scripts/full_test.py        # comprehensive API walkthrough
python scripts/verify_features.py  # feature flag / smoke check

# Frontend development
cd frontend
npm install
npm run dev       # runs on :3000
npm run lint      # ESLint
npm run build     # production build

# Seed database (requires running PostgreSQL)
python data/scripts/seed_db.py

# AWS deployment scripts
bash scripts/build_lambda.sh        # packages backend into Lambda ZIP
bash scripts/build_and_push.sh      # builds Docker images and pushes to ECR
```

## Environment Configuration

Backend settings are in `backend/app/config.py` using `pydantic_settings.BaseSettings`. Key env vars (set in `.env` at project root; see `.env.example`):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB` — DB connection (or `DATABASE_URL` to override)
- `SECRET_KEY` — JWT signing key (must change from default in production)
- `GEMINI_API_KEY`, `GEMINI_MODEL` — optional, for LLM chat/interview features (default model: `gemini-2.0-flash`)
- `SENTENCE_TRANSFORMER_MODEL` — ML model name (default `all-MiniLM-L6-v2`)
- `NEXT_PUBLIC_API_URL` — frontend env var pointing to backend (default `http://localhost:8000`)
- `AWS_REGION` — AWS region (default `ap-southeast-1`)
- `BEDROCK_MODEL_ID` — AWS Bedrock model (default `anthropic.claude-3-5-sonnet-20241022-v2:0`)
- `SAGEMAKER_EMBEDDING_ENDPOINT` — optional SageMaker embeddings endpoint name
- `OPENSEARCH_HOST`, `OPENSEARCH_USERNAME`, `OPENSEARCH_PASSWORD` — optional OpenSearch for enterprise deployment

## Architecture

### Backend

- `backend/app/main.py` — FastAPI entry point; handles startup lifecycle: creates tables, syncs schema (`_sync_schema` adds missing columns via ALTER TABLE), seeds reference data, warms up ML models and FAISS indexes; exports `handler` (Mangum) for Lambda
- `backend/app/config.py` — centralized settings via `pydantic_settings`
- `backend/app/database.py` — SQLAlchemy engine, session factory, `get_db` dependency (pool_size=5, max_overflow=10, pre_ping enabled)
- `backend/app/auth.py` — JWT utilities (access + refresh tokens, JTI blacklist with TTL cleanup)
- `backend/app/api_key_auth.py` — API key authentication; alternative to JWT for programmatic/tenant access
- `backend/app/limiter.py` — Rate limiting middleware via slowapi

**Routers** (`backend/app/routers/`, all mounted under `/api`):
auth, profile, recommend, skill_gap, upskilling, chat, interview, jd_match, resume_rewriter, upload, export, dashboard, market, compare, courses, progress, projects, peer, sso, api_keys, audit_logs, voice, rag, gap_analysis

**Services** (`backend/app/services/`):
`recommender` (hybrid scoring), `skill_matcher` (embedding similarity), `gap_analyzer`, `roadmap_generator`, `course_pathways`, `resume_parser`, `market_simulator`, `subsidy_calculator` (SkillsFuture/MCES), `audit_logger`, `bedrock_service` (AWS Bedrock LLM), `sagemaker_service` (SageMaker embeddings), `voice_service`, `dashboard_service`

**ML layer** (`backend/app/ml/`):

- `embeddings.py` — Sentence Transformer wrapper; global model instance loaded at startup; `encode_texts()` + cosine similarity
- `taxonomy.py` — FAISS-based skill normalization; maps free-text skills to canonical taxonomy names (threshold 0.75)

- `backend/app/models/` — SQLAlchemy ORM models (all models have `tenant_id` foreign key); includes `snapshot.py` for ML feature snapshots
- `backend/app/schemas/` — Pydantic request/response schemas
- `backend/alembic/` — Database migrations (prefer `_sync_schema()` for simple column additions; use Alembic for structural changes)
- `backend/pyproject.toml` — pytest config; sets `asyncio_mode = auto` (required for async test functions)

**Docker build note**: The backend Dockerfile pre-downloads spaCy and Sentence Transformer models at build time and sets `HF_HUB_OFFLINE=1` so containers work in private subnets without internet access.

### Frontend

- `frontend/app/` — Next.js App Router; pages by feature: recommendations, skill-gap, roadmap, jd-match, chat, interview, market, compare, courses, progress, projects, peers, resume-rewriter, dashboard, account
- `frontend/components/` — `ui/` (shadcn primitives), `layout/` (navbar, breadcrumbs), feature components (gap-table, skill-chip, match-score-bar, roadmap-timeline, workflow-stepper, skeleton-card, empty-state, error-boundary, voice-coach, page-transition, theme-provider)
- `frontend/lib/api-client.ts` — Axios instance with JWT auto-attach and token refresh (shared Promise to prevent race conditions); auto-redirects to `/login` on auth failure
- `frontend/contexts/tenant-context.tsx` — Multi-tenant theming context; injects CSS custom properties per tenant
- `frontend/middleware.ts` — Security headers (CSP, X-Frame-Options, Permissions-Policy)

### Data

- `data/seed/` — `skills_taxonomy.json` (~150+ skills, categories: programming, cloud, data, security, etc.), `job_roles.json` (SGD salary benchmarks), `sctp_courses.json` (SkillsFuture SCTP courses with subsidy fields)
- Auto-seeding: backend seeds on startup if the `Global` tenant has no skills data

### Dedicated Lambda Handlers

`lambdas/` contains standalone Lambda functions for async/event-driven workloads, separate from the main FastAPI/Mangum handler:

- `base.py` — shared `bootstrap_env()` that populates env vars from AWS Secrets Manager at cold start (idempotent)
- `bedrock_orchestrator.py` — AWS Bedrock LLM orchestration
- `embedding_generator.py` — SageMaker embedding generation
- `gap_analysis_handler.py` — async skill gap analysis
- `rag_query_handler.py` — RAG pipeline queries
- `resume_upload_handler.py` — S3-triggered resume processing
- `voice_coaching_handler.py` — WebSocket voice coaching pipeline

### Infrastructure

Terraform modules in `terraform/modules/`: `vpc`, `database` (Aurora Serverless v2 + pgvector), `backend` (Lambda + API Gateway), `lambda_backend`, `api_gateway`, `frontend` (S3 + CloudFront), `s3_frontend`, `cloudfront`, `alb`, `ecr`, `ecs`, `rds`, `security_groups`, `storage`, `iam`, `opensearch`, `sagemaker`, `websocket`.

CI/CD: `.github/workflows/deploy-serverless.yml` — active, uses static IAM keys from GitHub environment secrets (`dev`/`prod`), targets `us-east-1`. See Serverless AWS Deployment section for usage.

### n8n Workflows

Automation workflows in `n8n/workflows/` (accessible at port 5678):

- `market_simulation.json` — Periodic market data updates
- `resume_ingestion.json` — Resume upload processing pipeline
- `analysis_notification.json` — Result notification dispatch

### Tests

- `backend/tests/` — pytest tests with SQLite in-memory fixtures; `conftest.py` provides `db_session`, `sample_profile`, `sample_role` fixtures
- `tests/` — Integration/endpoint tests (top-level); e.g. `test_dashboard_endpoint.py`

## Lambda Deployment Gotchas

Critical non-obvious issues discovered in production:

- **`Mangum(lifespan="off")` skips FastAPI startup events**: The `@app.lifespan` context manager (which calls `_seed_database()`, `_background_ml_warmup()`, etc.) never runs in Lambda. These are called **explicitly at module level** in `backend/lambda_handler.py` instead. If you add startup logic to `main.py`, also wire it in `lambda_handler.py`.

- **Docker buildx + Lambda**: Always pass `--provenance=false` to `docker buildx build`. Without it, newer BuildKit adds SLSA attestations creating an OCI manifest list, which Lambda rejects with `InvalidParameterValueException: image manifest ... not supported`.

- **`update-function-code` is not instant**: After calling `aws lambda update-function-code`, warm containers may still serve old code for 1–2 minutes. Wait before testing, or send a few requests to exhaust the warm pool.

- **`skip_terraform=true` Lambda update**: The workflow explicitly calls `aws lambda update-function-code` for all 6 functions (`api`, `voice`, `rag-query`, `embed-gen`, `gap-analysis`, `resume-upload`) when `skip_terraform=true`. Without this, the new ECR image is pushed but Lambda keeps the old one.

- **Lambda INIT timeout logging**: Lambda reports `INIT_REPORT Init Duration: 9999ms Phase: init Status: timeout` when module-level imports (PyTorch, spaCy) take >10s. This is a logging threshold only — execution continues. It does NOT mean the Lambda failed.

- **Memory**: Lambda is configured to 3008 MB. Sentence Transformers + FAISS index use ~1 GB. Lower values (e.g. 1024 MB) cause OOM 503s on ML endpoints.

- **Auth login is form-encoded**: `POST /api/auth/login` uses OAuth2 `application/x-www-form-urlencoded` with field `username` (not `email`), not JSON. Register requires `password_confirm` and `tenant_name` fields.

- **`extract_skills()` fallback**: When Gemini quota is exhausted or key is absent, `resume_parser.extract_skills()` falls back to regex keyword-matching against the skill taxonomy (150+ skills). `POST /api/jd-match` will still work without a Gemini key.

## Key Design Decisions

- **Hybrid scoring**: `0.55 × content_similarity + 0.25 × rule_match + 0.20 × career_switcher_bonus`
- **Skill levels**: 0 (missing), 0.5 (partial), 1.0 (strong)
- **FAISS in-memory** for vector similarity search (rebuilt on startup)
- **LLM fallback**: Gemini API → rule-based responses (chat/interview); `bedrock_service` provides an alternate path via AWS Bedrock; `extract_skills()` falls back to taxonomy keyword scan when Gemini fails
- **Auth is optional**: core features (profile, recommendations, skill gap) work without login
- **Multi-tenancy**: all data models include `tenant_id`; a `Global` tenant is auto-created on startup
- **Schema sync**: `_sync_schema()` in `main.py` auto-adds new model columns to existing DB tables (no manual migration needed for column additions)
- **Startup warmup**: ML model, taxonomy FAISS index, and skill cache are pre-loaded during FastAPI lifespan (local/Docker) and via a daemon thread started at module level in `lambda_handler.py` (Lambda)
- **Recommendation cache**: in-memory TTL cache (300s) in `recommender.py`

## Security

- Password complexity: 8+ chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char (validated in Pydantic schemas)
- File uploads: 10 MB limit (chunked read), MIME type allowlist
- Account deletion: soft delete (deactivate + PII cleared), not hard delete
- Token blacklist: bounded OrderedDict with TTL cleanup (max 10K entries)
- DB pool: `pool_size=5, max_overflow=10, pool_pre_ping=True`
- CORS: credentials enabled, restricted allowed headers (`Authorization`, `Content-Type`, `Accept`)
- Profile endpoints: IDOR-protected with `user_id` check on authenticated requests
- Schema sync: double-quoted SQL identifiers for defense in depth
- Gemini calls: 30-second timeout
- Frontend: Next.js middleware for CSP, X-Frame-Options, Permissions-Policy; token refresh uses shared Promise (no race condition); AbortController cleanup on unmount
- Audit logger: truncates detail values >1000 chars

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
| POST   | /api/chat                     | Career coach chatbot                  |
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
| POST   | /api/calculate-subsidy        | Calculate subsidy for a course        |
| GET    | /api/sso/login                | SSO login (dev only)                  |
| GET    | /api/sso/callback             | SSO callback (dev only)               |
| POST   | /api/api-keys/                | Create API key (admin)                |
| GET    | /api/api-keys/                | List API keys (admin)                 |
| DELETE | /api/api-keys/{id}            | Revoke API key (admin)                |
| GET    | /api/audit-logs/              | List audit logs (admin)               |
| POST   | /api/rag/query                | RAG-based document retrieval          |
| POST   | /api/gap-analysis             | Async skill gap analysis              |
| POST   | /api/voice                    | Voice coaching session                |
