# Job Recommendation & Skill Gap Analysis System

A career intelligence platform for SCTP learners and career-switchers in Singapore. Submit your profile or resume to get matched with suitable job roles, understand your skill gaps, and receive a personalized upskilling roadmap with SkillsFuture Credit integration.

## Features

### Core
- **Profile Analysis** — Upload a PDF/DOCX resume or manually enter skills; AI extracts and normalizes skills via Sentence Transformers + spaCy. Profiles support age for subsidy eligibility, and can be retrieved and edited via GET/PATCH endpoints.
- **Job Recommendations** — Hybrid AI scoring (60% content similarity + 25% rule-based + 15% career-switcher bonus) with match rationale. Each recommendation displays a skill match quality badge (strong/moderate/developing), a Profile Fit score bar, and a career-switcher bonus indicator.
- **Skill Gap Analysis** — Per-role breakdown with radar and bar chart visualizations
- **Upskilling Roadmap** — Personalized learning plan with SCTP courses, timelines, and PDF export

### Intelligence
- **WorkD AI Career Advisor** — LLM-powered Senior Career Advisor persona with Singapore labor market expertise (SSG Skills Framework, MCES, SkillsFuture Credit). Includes 2026 market insights context, automatic MCES guidance for users aged 40+, and suggested prompt chips for quick interaction. Falls back to policy-aware rule-based responses when no OpenAI API key is configured.
- **Mock Interview Simulator** — Role-specific interview practice with feedback and performance assessment. Gap-targeted questions are flagged with the specific skill being tested, so users know which weaknesses are being probed.
- **JD Match** — Paste any job description for instant skill gap analysis against your profile
- **Singapore Market Insights** — Salary benchmarks, demand levels, hiring volume, and YoY growth by sector

### Analysis
- **SCTP Course Browser** — Browse all 25 SkillsFuture Career Transition Programme courses with real-time subsidy calculations. Filter by provider, level, MCES eligibility, or skill. Each course card shows the full fee breakdown: course fee, subsidy amount, SkillsFuture Credit offset, and net payable.
- **Multi-Role Comparison** — Side-by-side comparison of 2–4 roles (match score, salary, transition difficulty, skill overlap)
- **Peer Comparison** — See how your profile stacks up against others targeting similar roles (anonymized)
- **Portfolio Project Suggestions** — Curated project ideas for each missing skill to build your portfolio

### Tracking & Account
- **Progress Dashboard** — Record skill acquisitions over time with timeline charts
- **SkillsFuture Subsidy Calculator** — Standalone subsidy calculation for any SCTP course, factoring in base subsidy, MCES enhancement (90% for career switchers), and SkillsFuture Credit offset
- **User Authentication** — JWT access tokens (15 min) with rotating refresh tokens (7 day). Rate-limited login/register endpoints, account lockout after 5 failed attempts, email normalization, and in-memory JTI blacklist for token revocation. Profiles are auto-linked to accounts on creation, with ownership guards on edits.
- **Account Settings** — Update name/email, change password, and delete account with confirmation. Profiles linked to an account are protected from unauthorized edits.
- **Password Recovery** — Token-based forgot/reset password flow (demo mode returns token directly; production-ready for email delivery)
- **Security Hardening** — Security headers middleware (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, HSTS in production), rate limiting via slowapi, input validation with email regex and password confirmation, and startup secret validation in production mode

## Quick Start (Local-First)

```bash
cp .env.example .env
./scripts/rebuild-local.sh
```

- Frontend (Vite dev): http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs
- DB UI (Adminer): http://localhost:8080

If you prefer the production-style static frontend container:

```bash
docker compose up --build
```

- Frontend (Nginx): http://localhost:3000

## Development

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Seed Database

```bash
python data/scripts/seed_db.py
```

### Tests

```bash
cd backend
pytest
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Current user info |
| PATCH | `/api/auth/me` | Update name/email |
| DELETE | `/api/auth/me` | Delete account + linked profile |
| POST | `/api/auth/change-password` | Change password (authenticated) |
| POST | `/api/auth/refresh` | Rotate refresh token, get new token pair |
| POST | `/api/auth/logout` | Revoke refresh token |
| POST | `/api/auth/forgot-password` | Request password reset token |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/profile` | Create user profile |
| GET | `/api/profile/me` | Get authenticated user's linked profile |
| GET | `/api/profile/{id}` | Retrieve user profile |
| PATCH | `/api/profile/{id}` | Update user profile (ownership guard) |
| POST | `/api/upload-resume` | Upload PDF/DOCX resume |
| POST | `/api/recommend` | Get job recommendations |
| GET | `/api/skill-gap/{id}` | Skill gap analysis |
| GET | `/api/upskilling/{id}` | Upskilling roadmap |
| POST | `/api/jd-match` | Match profile against a job description |
| POST | `/api/chat` | Career coach chatbot |
| POST | `/api/interview` | Mock interview simulator |
| GET | `/api/market-insights` | Singapore labor market data |
| POST | `/api/compare-roles` | Multi-role comparison |
| GET | `/api/roles` | List all roles |
| GET | `/api/peer-comparison/{id}` | Anonymized peer comparison |
| GET | `/api/project-suggestions/{id}` | Portfolio project ideas |
| POST | `/api/progress` | Record skill progress |
| GET | `/api/progress/{id}` | Progress dashboard |
| GET | `/api/progress/{id}/timeline` | Progress timeline data |
| GET | `/api/courses` | List SCTP courses (filterable) |
| POST | `/api/calculate-subsidy` | Calculate subsidy for a course |
| GET | `/api/export/roadmap/{id}` | Export roadmap as PDF |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, MUI 6, Recharts |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2 |
| AI/ML | Sentence Transformers (all-MiniLM-L6-v2), spaCy, FAISS |
| LLM | OpenAI API (optional, rule-based fallback) |
| Database | PostgreSQL 16 |
| Auth | JWT (access + refresh tokens) + bcrypt + slowapi rate limiting |
| Cloud | Optional (repository includes legacy Terraform AWS modules) |
| DNS/TLS | Localhost by default (optional reverse proxy/domain in self-hosted setups) |
| IaC | Docker Compose for local orchestration |
| CI/CD | GitHub Actions |
| Deploy | Docker Compose (local/self-hosted) |

## Local Hosting Architecture

```
Browser (localhost:5173 or :3000)
            │
            ▼
      FastAPI (localhost:8000)
            │
            ▼
   PostgreSQL 16 (localhost:5432)
```

This repo is now optimized for local/self-hosted development. Use `docker-compose.yml` for a production-like container run, or combine it with `docker-compose.local.yml` for hot reload + Adminer. Detailed steps live in `docs/LOCAL_HOSTING.md`.

## Project Structure

```
dsai-capstone/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── auth.py              # JWT authentication
│   │   ├── config.py            # Settings & env vars
│   │   ├── database.py          # SQLAlchemy connection
│   │   ├── models/              # ORM models (7 models)
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API endpoints (16 routers)
│   │   ├── services/            # Business logic (6 services)
│   │   └── ml/                  # ML pipelines (embeddings, taxonomy)
│   └── tests/
├── frontend/
│   └── src/
│       ├── pages/               # 15 React pages
│       └── components/          # Reusable UI components
├── terraform/
│   ├── main.tf                  # Root module wiring
│   ├── modules/
│   │   ├── networking/          # VPC, subnets, SGs, VPC endpoints
│   │   ├── database/            # RDS PostgreSQL
│   │   ├── ecs/                 # Fargate cluster, ALB, IAM
│   │   ├── ecr/                 # Container registry
│   │   ├── frontend/            # S3 + CloudFront
│   │   ├── dns/                 # Route 53, ACM certificate, DNS records
│   │   ├── secrets/             # Secrets Manager + SSM
│   │   └── monitoring/          # CloudWatch logs + alarms
│   └── providers.tf
├── .github/workflows/           # CI/CD pipelines (4 workflows)
├── docs/
│   └── LOCAL_HOSTING.md         # Local-first runbook
├── scripts/
│   └── rebuild-local.sh         # Clean rebuild + migrate + seed
├── data/
│   ├── seed/                    # 50 job roles, 83 skills, 25 courses
│   └── scripts/                 # Database seed script
└── docker-compose.yml
```

## Seed Data

- **50 Singapore tech job roles** across 6 categories (Data, Software, Cloud, Security, AI/ML, Product)
- **~83 skills** in 9 taxonomy categories
- **25 SCTP courses** from 6 providers (NUS-ISS, NTU, SMU Academy, NTUC LearningHub, General Assembly, Vertical Institute)
- **6 market insight sectors** with salary, demand, and growth data
