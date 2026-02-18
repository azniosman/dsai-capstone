# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SkillBridge AI — Job Recommendation & Skill Gap Analysis System for SCTP learners and career-switchers in Singapore.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui + Recharts
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy 2 + Pydantic
- **AI/ML**: Sentence Transformers (`all-MiniLM-L6-v2`), spaCy, FAISS
- **Database**: PostgreSQL 16
- **Automation**: n8n workflows
- **Deployment**: Docker Compose; AWS via Terraform (ECS Fargate + RDS)

## Build & Run Commands

```bash
# Full stack (Docker) — starts db, backend, frontend, n8n
docker compose up

# Backend development (local)
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm   # required for NLP features
uvicorn app.main:app --reload             # runs on :8000

# Backend tests (uses in-memory SQLite, no DB needed)
cd backend && pytest
cd backend && pytest tests/test_recommender.py -v        # single file
cd backend && pytest tests/test_recommender.py::test_name -v  # single test

# Frontend development
cd frontend
npm install
npm run dev       # runs on :3000
npm run lint      # ESLint
npm run build     # production build

# Seed database (requires running PostgreSQL)
python data/scripts/seed_db.py
```

## Environment Configuration

Backend settings are in `backend/app/config.py` using `pydantic_settings.BaseSettings`. Key env vars (set in `.env` at project root or via environment):

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB` — DB connection (or `DATABASE_URL` to override)
- `SECRET_KEY` — JWT signing key (must change from default in production)
- `GEMINI_API_KEY`, `GEMINI_MODEL` — optional, for LLM chat/interview features
- `SENTENCE_TRANSFORMER_MODEL` — ML model name (default `all-MiniLM-L6-v2`)
- `NEXT_PUBLIC_API_URL` — frontend env var pointing to backend (default `http://localhost:8000`)

## Architecture

### Backend

- `backend/app/main.py` — FastAPI entry point; handles startup lifecycle: creates tables, syncs schema (`_sync_schema` adds missing columns via ALTER TABLE), seeds reference data, warms up ML models and FAISS indexes
- `backend/app/config.py` — centralized settings via `pydantic_settings`
- `backend/app/database.py` — SQLAlchemy engine, session factory, `get_db` dependency (pool_size=5, max_overflow=10, pre_ping enabled)
- `backend/app/auth.py` — JWT utilities (access + refresh tokens, JTI blacklist with TTL cleanup)
- `backend/app/api_key_auth.py` — API key authentication; alternative to JWT for programmatic/tenant access
- `backend/app/limiter.py` — Rate limiting middleware via slowapi

**Routers** (`backend/app/routers/`, all mounted under `/api`):
auth, profile, recommend, skill_gap, upskilling, chat, interview, jd_match, resume_rewriter, upload, export, dashboard, market, compare, courses, progress, projects, peer, sso, api_keys, audit_logs

**Services** (`backend/app/services/`):
`recommender` (hybrid scoring), `skill_matcher` (embedding similarity), `gap_analyzer`, `roadmap_generator`, `course_pathways`, `resume_parser`, `market_simulator`, `subsidy_calculator` (SkillsFuture/MCES), `audit_logger`

**ML layer** (`backend/app/ml/`):
- `embeddings.py` — Sentence Transformer wrapper; global model instance loaded at startup; `encode_texts()` + cosine similarity
- `taxonomy.py` — FAISS-based skill normalization; maps free-text skills to canonical taxonomy names (threshold 0.75)

- `backend/app/models/` — SQLAlchemy ORM models (all models have `tenant_id` foreign key)
- `backend/app/schemas/` — Pydantic request/response schemas
- `backend/alembic/` — Database migrations (prefer `_sync_schema()` for simple column additions; use Alembic for structural changes)
- `backend/pyproject.toml` — pytest config; sets `asyncio_mode = auto` (required for async test functions)

### Frontend

- `frontend/app/` — Next.js App Router; pages by feature: recommendations, skill-gap, roadmap, jd-match, chat, interview, market, compare, courses, progress, projects, peers, resume-rewriter, dashboard
- `frontend/components/` — `ui/` (shadcn primitives), `layout/` (navbar, breadcrumbs), feature components (gap-table, skill-chip, match-score-bar, roadmap-timeline, workflow-stepper, skeleton-card, empty-state, error-boundary)
- `frontend/lib/api-client.ts` — Axios instance with JWT auto-attach and token refresh (shared Promise to prevent race conditions); auto-redirects to `/login` on auth failure
- `frontend/contexts/tenant-context.tsx` — Multi-tenant theming context; injects CSS custom properties per tenant
- `frontend/middleware.ts` — Security headers (CSP, X-Frame-Options, Permissions-Policy)

### Data

- `data/seed/` — `skills_taxonomy.json` (~150+ skills, categories: programming, cloud, data, security, etc.), `job_roles.json` (SGD salary benchmarks), `sctp_courses.json` (SkillsFuture SCTP courses with subsidy fields)
- Auto-seeding: backend seeds on startup if the `Global` tenant has no skills data

### n8n Workflows

Automation workflows in `n8n/workflows/` (accessible at port 5678):
- `market_simulation.json` — Periodic market data updates
- `resume_ingestion.json` — Resume upload processing pipeline
- `analysis_notification.json` — Result notification dispatch

### Tests

- `backend/tests/` — pytest tests with SQLite in-memory fixtures; `conftest.py` provides `db_session`, `sample_profile`, `sample_role` fixtures
- `tests/` — Integration/endpoint tests (top-level); e.g. `test_dashboard_endpoint.py`

## Key Design Decisions

- **Hybrid scoring**: `0.55 × content_similarity + 0.25 × rule_match + 0.20 × career_switcher_bonus`
- **Skill levels**: 0 (missing), 0.5 (partial), 1.0 (strong)
- **FAISS in-memory** for vector similarity search (rebuilt on startup)
- **LLM fallback**: Gemini API when `GEMINI_API_KEY` is set, otherwise rule-based responses
- **Auth is optional**: core features (profile, recommendations, skill gap) work without login
- **Multi-tenancy**: all data models include `tenant_id`; a `Global` tenant is auto-created on startup
- **Schema sync**: `_sync_schema()` in `main.py` auto-adds new model columns to existing DB tables (no manual migration needed for column additions)
- **Startup warmup**: ML model, taxonomy FAISS index, and skill cache are pre-loaded during FastAPI lifespan to avoid cold-start latency
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

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login (returns JWT) |
| GET | /api/auth/me | Current user info |
| POST | /api/profile | Create user profile |
| POST | /api/upload-resume | Upload PDF/DOCX resume |
| POST | /api/recommend | Get job recommendations |
| GET | /api/skill-gap/{id} | Skill gap analysis |
| GET | /api/upskilling/{id} | Upskilling roadmap |
| POST | /api/jd-match | Match profile against job description |
| POST | /api/chat | Career coach chatbot |
| POST | /api/interview | Mock interview simulator |
| GET | /api/market-insights | Singapore labor market data |
| POST | /api/compare-roles | Multi-role comparison |
| GET | /api/roles | List all roles |
| GET | /api/peer-comparison/{id} | Anonymized peer comparison |
| GET | /api/project-suggestions/{id} | Portfolio project ideas |
| POST | /api/progress | Record skill progress |
| GET | /api/progress/{id} | Get progress dashboard |
| GET | /api/progress/{id}/timeline | Progress timeline data |
| GET | /api/export/roadmap/{id} | Export roadmap as PDF |
| GET | /api/courses | List SCTP courses |
| POST | /api/calculate-subsidy | Calculate subsidy for a course |
| GET | /api/sso/login | SSO login (dev only) |
| GET | /api/sso/callback | SSO callback (dev only) |
| POST | /api/api-keys/ | Create API key (admin) |
| GET | /api/api-keys/ | List API keys (admin) |
| DELETE | /api/api-keys/{id} | Revoke API key (admin) |
| GET | /api/audit-logs/ | List audit logs (admin) |
