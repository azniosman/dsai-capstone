# SkillBridge

**AI-Driven Career Intelligence for Singapore's SCTP Learners & Career Switchers**

SkillBridge bridges the gap between current skills and future-ready tech roles. It delivers personalized upskilling pathways, hybrid job matching, interactive AI career coaching, and real-time Singapore market data — all grounded in the SkillsFuture (SSG) framework.

![Overview](misc/images/aioverview.png)

---

## Features

### Resume & Skill Intelligence
- **Bedrock Resume Parser** — Uploads analyzed by AWS Bedrock (Claude 3.5 Sonnet); extracts skills, readiness score, strengths, missing skills, and suggested roles
- **JD Match** — Paste any job description for instant gap analysis against your profile
- **Resume Rewriter** — AI rewrites bullet points for maximum impact against a target role
- **Keyword Fallback** — If Bedrock is unavailable, spaCy + taxonomy keyword extraction ensures skills are always extracted

### Job Matching & Gap Analysis
- **Hybrid Scoring** — `0.55 × content_similarity + 0.25 × rule_match + 0.20 × career_switcher_bonus`
- **FAISS Skill Taxonomy** — 150+ skills normalized to canonical names via in-memory vector index
- **Skill Gap Visualization** — Radar charts and severity-ranked gap tables per target role
- **Multi-Role Comparison** — Side-by-side comparison of up to 4 roles

### AI Career Coach
- **Context-Aware Chat** — Knows your profile, skill gaps, recommended courses, and 2026 Singapore market trends; powered by Google Gemini (primary) → AWS Bedrock (fallback)
- **Mock Interview Simulator** — Role-specific questions at configurable difficulty levels
- **Voice Coach** — Real-time voice interview via WebSocket API Gateway → Lambda → Bedrock TTS pipeline

### Learning & Market
- **SCTP Pathways** — Structured Beginner → Advanced paths using validated SkillsFuture courses
- **Subsidy Calculator** — Real-time MCES (90% for age 40+), SkillsFuture Credit, and Training Allowance calculation
- **Market Simulator** — Daily fluctuation simulation for Singapore tech salaries, hiring volume, and demand
- **2026 Forecasts** — Benchmarks across AI/ML, Cloud, Cybersecurity, Data, and Software Engineering sectors

### Platform
- **Multi-tenancy** — All data scoped by `tenant_id`; `Global` tenant auto-created on startup
- **Auth optional** — Core features (profile, recommendations, gap analysis) work without login
- **PDF/DOCX upload** — 10 MB limit with MIME allowlist
- **PDF roadmap export**, peer comparison, portfolio project suggestions, skill progress tracking
- **n8n Automation** — Resume ingestion, market data refresh, and notification workflows

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Framer Motion |
| **Backend** | Python 3.11, FastAPI, SQLAlchemy 2, Pydantic, Mangum (Lambda adapter), spaCy, slowapi |
| **AI / ML** | AWS Bedrock (Claude 3.5 Sonnet), Google Gemini, Sentence Transformers (`all-MiniLM-L6-v2`), FAISS, pgvector |
| **Database** | PostgreSQL 16 / Aurora Serverless v2 |
| **Automation** | n8n |
| **Infrastructure** | AWS Lambda + API Gateway HTTP & WebSocket, S3, CloudFront, ECR, VPC, RDS |
| **IaC / CI/CD** | Terraform 1.9, GitHub Actions |

---

## Architecture

### Capstone Serverless (Current)

```
Browser ──► CloudFront / S3  (Next.js static export)
               │
               ▼
API Gateway HTTP API  ──►  Lambda (FastAPI + Mangum)
                               │
               ┌───────────────┼──────────────────┐
               ▼               ▼                  ▼
        Aurora Serverless  AWS Bedrock       FAISS (in-memory)
        v2 + pgvector      Claude 3.5        Skill taxonomy
        (PostgreSQL 16)    Sonnet

Browser ──► API Gateway WebSocket  ──►  Lambda (voice)
                                           │
                                    Bedrock Transcribe / TTS
```

**Estimated cost at rest:** ~$45/month (Aurora $43 + NAT Gateway $32 — NAT can be paused between demos)

### Enterprise Roadmap

High-throughput target state: ECS Fargate, OpenSearch Serverless, EventBridge, WAF/Shield. See [Enterprise-Technical_Roadmap.md](Enterprise-Technical_Roadmap.md).

---

## Quick Start (Docker)

```bash
git clone https://github.com/azniosman/dsai-capstone.git
cd dsai-capstone
cp .env.example .env          # add GEMINI_API_KEY at minimum
bash scripts/deploy.sh        # wraps docker compose up -d --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API + Swagger | http://localhost:8000/docs |
| n8n Automation | http://localhost:5678 |

---

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn app.main:app --reload          # :8000

# Tests (SQLite in-memory, no DB needed)
pytest
pytest tests/test_recommender.py -v    # single file
pytest tests/test_recommender.py::test_name -v  # single test
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # :3000
npm run lint
npm run build
```

### Seed Database

```bash
python data/scripts/seed_db.py
```

### Full Integration Test (requires running backend)

```bash
python scripts/full_test.py

# Against live AWS deployment
sed 's|http://localhost:8000|https://<api-endpoint>|' scripts/full_test.py | python3
```

---

## AWS Deployment

### Prerequisites

1. AWS credentials with IAM permissions for Lambda, API Gateway, ECR, RDS, S3, Bedrock, VPC
2. **Enable Bedrock model access** — Go to [AWS Bedrock → Model access](https://console.aws.amazon.com/bedrock/home#/modelaccess), request **Anthropic Claude 3.5 Sonnet**. Approval is typically instant. Without this, Bedrock calls return `ValidationException: Operation not allowed`.
3. GitHub repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DB_PASSWORD`, `SECRET_KEY`, `GEMINI_API_KEY`

### CI/CD (GitHub Actions)

The workflow is **manual dispatch only** (no auto-trigger on push):

```bash
# Full deploy — rebuilds all AWS infrastructure from scratch (~30 min, Aurora creation)
gh workflow run deploy-serverless.yml -f environment=dev -f skip_terraform=false

# Fast deploy — new image + frontend only (~5 min, reuses existing infra)
gh workflow run deploy-serverless.yml -f environment=dev -f skip_terraform=true
```

The workflow performs:
1. ECR create/import → Docker build + push (Lambda container image, `--provenance=false`)
2. Terraform plan + apply (VPC, Aurora Serverless v2, Lambda × 6, API Gateway HTTP + WebSocket, S3)
3. Next.js static export build with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_VOICE_WS_URL` baked in
4. S3 sync in 3 passes: immutable assets (1-year cache) → HTML (no-cache) → extension-less copies for clean URL routing
5. API smoke test polling `/health` up to 5 minutes

### Manual Terraform

```bash
export TF_VAR_db_password="$(openssl rand -hex 24)"
export TF_VAR_secret_key="$(openssl rand -hex 32)"
bash scripts/deploy-serverless.sh dev

# Pause NAT Gateway between demos to save ~$32/month
terraform destroy \
  -target='module.vpc.aws_nat_gateway.main' \
  -target='module.vpc.aws_eip.nat'
```

---

## Environment Variables

```ini
# Database
POSTGRES_USER=skillbridge
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=skillbridge

# Security
SECRET_KEY=your_secure_random_key_here

# AI Services
GEMINI_API_KEY=AIzaSy...                      # Primary chat engine
GEMINI_MODEL=gemini-2.0-flash
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0  # Cross-region inference profile ID
AWS_REGION=us-east-1

# Frontend (build-time)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_VOICE_WS_URL=wss://<api-id>.execute-api.us-east-1.amazonaws.com/dev

# Optional
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
SAGEMAKER_EMBEDDING_ENDPOINT=                 # SageMaker serverless embeddings
OPENSEARCH_HOST=                              # Enterprise vector search
```

> **Bedrock note:** Always use the cross-region inference profile ID (`us.anthropic...`) not the direct model ID (`anthropic...`). The direct ID returns `Operation not allowed` even with correct IAM permissions.

---

## Project Structure

```
dsai-capstone/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry + startup lifecycle (schema sync, ML warmup, seeding)
│   │   ├── routers/         # auth, profile, recommend, skill_gap, chat, interview,
│   │   │                    # jd_match, resume_rewriter, upload, market, courses,
│   │   │                    # compare, projects, progress, peer, voice, dashboard …
│   │   ├── services/        # recommender, gap_analyzer, resume_parser, bedrock_service,
│   │   │                    # roadmap_generator, course_pathways, subsidy_calculator …
│   │   └── ml/              # embeddings.py (Sentence Transformers), taxonomy.py (FAISS)
│   ├── tests/               # pytest with SQLite in-memory fixtures
│   └── Dockerfile.lambda    # Pre-downloads spaCy + HF models; sets HF_HUB_OFFLINE=1
├── frontend/
│   ├── app/                 # App Router pages (dashboard, recommendations, skill-gap,
│   │                        # roadmap, jd-match, chat, interview, market, courses …)
│   └── components/          # ui/ (shadcn), layout/, feature components
├── terraform/
│   └── modules/             # vpc, database (Aurora+pgvector), lambda_backend,
│                            # api_gateway, websocket, s3_frontend, ecr, iam …
├── scripts/
│   ├── deploy-serverless.sh # Local Terraform + Docker build + S3 sync wrapper
│   └── full_test.py         # End-to-end integration test (20 endpoints)
├── n8n/workflows/           # market_simulation, resume_ingestion, analysis_notification
├── data/seed/               # skills_taxonomy.json, job_roles.json, sctp_courses.json
└── docker-compose.yml       # Local: db (pgvector), backend, frontend, n8n
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login (form-encoded, returns JWT) |
| POST | `/api/profile` | Create profile |
| POST | `/api/upload-resume` | Upload PDF/DOCX, extract skills via Bedrock |
| POST | `/api/recommend` | Hybrid job recommendations |
| GET | `/api/skill-gap/{id}` | Skill gap analysis |
| GET | `/api/upskilling/{id}` | Upskilling roadmap |
| POST | `/api/jd-match` | Match profile against job description |
| POST | `/api/chat` | Career coach (Gemini → Bedrock, SSE stream) |
| POST | `/api/interview` | Mock interview simulator |
| POST | `/api/resume/rewrite` | Rewrite resume bullet point |
| GET | `/api/market-insights` | Singapore 2026 market data |
| POST | `/api/simulate` | Run market simulator |
| POST | `/api/compare-roles` | Multi-role comparison |
| GET | `/api/courses` | SCTP courses with subsidy |
| POST | `/api/pathways` | Learning pathways for skill gaps |
| GET | `/api/project-suggestions/{id}` | Portfolio project ideas |
| GET | `/api/peer-comparison/{id}` | Anonymized peer benchmarking |
| GET | `/api/export/roadmap/{id}` | Export roadmap as PDF |
| WebSocket | `wss://…/dev` | Voice coaching (connect/disconnect/default routes) |

Full interactive docs: `http://localhost:8000/docs`

---

## License

MIT — see `LICENSE`.

---

*SkillBridge — Empowering Singapore's Workforce*
