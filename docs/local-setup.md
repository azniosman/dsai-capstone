# SkillBridge — Local Development Setup

## Prerequisites

- Docker Desktop (for full-stack mode)
- Python 3.11 (for backend-only dev)
- Node.js 20+ / npm (for frontend-only dev)
- PostgreSQL 16 (optional; Docker provides it)

## Quick Start (Docker Compose)

```bash
cp .env.example .env          # fill in GEMINI_API_KEY if you have one
docker compose up             # starts db, backend (:8000), frontend (:3000), n8n (:5678)
```

The database is seeded automatically on first startup.

## Backend Only

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm   # required for NLP

# Set DB connection (or use Docker PostgreSQL)
export DATABASE_URL=postgresql://capstone:changeme@localhost:5432/capstone

uvicorn app.main:app --reload    # http://localhost:8000
```

### Run Tests

```bash
cd backend
pytest                                         # all tests (SQLite in-memory)
pytest tests/test_recommender.py -v            # single file
pytest tests/test_recommender.py::test_name -v # single test
```

No running database needed — tests use an in-memory SQLite fixture.

## Frontend Only

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
npm run lint     # ESLint
npm run build    # production build (must pass before PR)
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` (default) to point at the backend.

## Environment Variables

Key variables (copy from `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `POSTGRES_USER` | `capstone` | DB user |
| `POSTGRES_PASSWORD` | `changeme` | DB password |
| `POSTGRES_HOST` | `localhost` | DB host |
| `POSTGRES_DB` | `capstone` | DB name |
| `DATABASE_URL` | — | Override full connection string |
| `SECRET_KEY` | ⚠️ change me | JWT signing key |
| `GEMINI_API_KEY` | `""` | Gemini LLM (optional; falls back to Bedrock) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Gemini model |
| `AWS_REGION` | `ap-southeast-1` | AWS region |
| `BEDROCK_MODEL_ID` | cross-region Claude 3.5 | Bedrock model (requires console opt-in) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Frontend → backend URL |
| `CORS_ALLOWED_ORIGINS` | `["http://localhost:3000","http://localhost:5173"]` | Allowed CORS origins (JSON array) |

## Database Seeding

Seeding runs automatically on startup. To re-seed manually:

```bash
python data/scripts/seed_db.py
```

Seed data lives in `data/seed/`: `skills_taxonomy.json`, `job_roles.json`, `sctp_courses.json`.

## End-to-End Tests

Requires a running backend:

```bash
python scripts/full_test.py        # comprehensive API walkthrough
python scripts/verify_features.py  # feature smoke check
```

## AWS Deployment

See [CLAUDE.md](../CLAUDE.md#serverless-aws-deployment) for CI/CD and Terraform commands.

## Common Issues

**Sentence Transformer slow on first load**: Normal — model downloads on first run, then cached.

**`spacy` not found**: Run `python -m spacy download en_core_web_sm`.

**CORS errors in browser**: Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL.

**Bedrock `ValidationException`**: Enable model access in the AWS Bedrock console (Model access → request Claude 3.5 Sonnet v2). IAM permissions alone are insufficient.

**Auth `422 Unprocessable Entity` on login**: Login uses `application/x-www-form-urlencoded`, not JSON. Use `username` field (not `email`).
