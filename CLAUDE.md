# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DSAI Capstone — Job Recommendation & Skill Gap Analysis System for SCTP learners and career-switchers in Singapore.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + Tailwind + shadcn/radix + Recharts
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy 2
- **AI/ML**: Sentence Transformers (`all-MiniLM-L6-v2`), spaCy, FAISS
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose

## Build & Run Commands

```bash
# Full stack (Docker)
docker compose up

# Backend development
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Backend tests
cd backend && pytest
cd backend && pytest tests/test_recommender.py -v

# Frontend development
cd frontend
npm install
npm run dev

# Seed database
python data/scripts/seed_db.py
```

## Architecture

- `backend/app/main.py` — FastAPI entry point
- `backend/app/auth.py` — JWT authentication utilities
- `backend/app/routers/` — API endpoints:
  - Core: profile, recommend, skill-gap, upskilling
  - Features: auth, upload, jd_match, progress, chat, interview, market, compare, peer, projects, export
- `backend/app/services/` — Business logic (resume_parser, skill_matcher, recommender, gap_analyzer, roadmap_generator)
- `backend/app/ml/` — ML pipelines (embeddings, taxonomy normalization)
- `backend/app/models/` — SQLAlchemy ORM models (job_role, skill, sctp_course, user_profile, user, skill_progress, market_insight)
- `backend/app/schemas/` — Pydantic request/response schemas
- `frontend/app/` — Next.js App Router pages (page.tsx under recommendations, skill-gap, roadmap, jd-match, chat, interview, market, compare, peers, projects, progress, courses, login, account)
- `data/seed/` — Seed JSON data files

## Key Design Decisions

- Hybrid scoring: `0.55 × content_similarity + 0.25 × rule_match + 0.20 × career_switcher_bonus`
- Skill levels: 0 (missing), 0.5 (partial), 1.0 (strong)
- FAISS in-memory for vector similarity search
- LLM chatbot/interview uses OpenAI API when configured, falls back to rule-based responses
- Auth is optional — core features work without login

## Security

- Password complexity: 8+ chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char (validated in Pydantic schemas)
- File uploads: 10 MB limit (chunked read), MIME type allowlist
- Account deletion: soft delete (deactivate + PII cleared), not hard delete
- Token blacklist: bounded OrderedDict with TTL cleanup (max 10K entries)
- DB pool: `pool_size=5, max_overflow=10, pool_pre_ping=True`
- CORS: credentials enabled, restricted allowed headers (`Authorization`, `Content-Type`, `Accept`)
- Profile endpoints: IDOR-protected with `user_id` check on authenticated requests
- Schema sync: double-quoted SQL identifiers for defense in depth
- OpenAI calls: 30-second timeout
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
