# SkillBridge

**AI-Powered Career Intelligence Platform for Singapore's SCTP Learners & Career Switchers**

SkillBridge is a serverless, full-stack AI platform that helps SCTP learners and mid-career professionals navigate Singapore's evolving tech job market. It combines a Retrieval-Augmented Generation (RAG) pipeline, hybrid skill matching, and an interactive AI career coach — all grounded in real SkillsFuture course data, SSG salary benchmarks, and a live market simulator.

![Overview](misc/images/aioverview.png)

**Enterprise Roadmap:** See [Enterprise-Technical_Roadmap.md](Enterprise-Technical_Roadmap.md)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [AI & RAG Pipeline](#ai--rag-pipeline)
4. [Features](#features)
5. [Deployment](#deployment)
6. [Local Development](#local-development)
7. [API Reference](#api-reference)
8. [Security](#security)
9. [Cost Model](#cost-model)
10. [Future Improvements](#future-improvements)

---

## Architecture Overview

SkillBridge is deployed entirely on AWS serverless infrastructure. The backend is a containerized FastAPI application mounted on AWS Lambda via the Mangum adapter, exposed through API Gateway HTTP API v2. A separate WebSocket API Gateway handles the real-time voice coaching pipeline.

```
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│         Next.js 16 (Static Export) — S3 + CloudFront         │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS
           ┌────────────────┴───────────────┐
           │   API Gateway HTTP API (v2)    │    API Gateway WebSocket
           │         ANY /{proxy+}          │    $connect / $default / $disconnect
           └────────────────┬───────────────┘           │
                            │                           │
           ┌────────────────▼───────────────┐    ┌──────▼──────────────┐
           │  Lambda: skillbridge-{env}-api │    │ Lambda: voice       │
           │  FastAPI + Mangum adapter      │    │ Polly + Transcribe  │
           │  3008 MB · 120s timeout        │    │ WebSocket push      │
           └────┬──────────┬───────────┬───┘    └─────────────────────┘
                │          │           │
    ┌───────────▼─┐  ┌─────▼────┐  ┌──▼──────────────────────────────┐
    │  Aurora     │  │ AWS      │  │  Dedicated Lambda Functions      │
    │  Serverless │  │ Bedrock  │  │  rag-query · embed-gen           │
    │  v2 +       │  │ Claude   │  │  gap-analysis · resume-upload    │
    │  pgvector   │  │ 3.5 Son. │  │  (same ECR image, diff handler)  │
    └───────────┬─┘  └─────┬────┘  └──────────────────────────────────┘
                │          │
    ┌───────────▼──────────▼──────────────────────────────────────────┐
    │                    VPC (Private Subnets)                        │
    │  DB Credentials → AWS Secrets Manager                          │
    │  Container Images → Amazon ECR                                 │
    └─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. Browser loads the Next.js static site from S3 (optionally via CloudFront)
2. API calls are routed through API Gateway HTTP API → Lambda (`skillbridge-{env}-api`)
3. The FastAPI handler processes the request, querying Aurora Serverless v2 for profile and course data
4. For AI features, the handler invokes AWS Bedrock (Claude 3.5 Sonnet) directly, or routes through the RAG pipeline (embed → pgvector search → generate)
5. For voice sessions, the browser opens a WebSocket connection to a dedicated API Gateway → `voice` Lambda, which runs the full Transcribe → LLM → Polly pipeline

### Infrastructure Modules (Terraform)

| Module           | Resources                                                                                             |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `vpc`            | VPC, public/private subnets, NAT Gateway, Internet Gateway, route tables                              |
| `database`       | Aurora Serverless v2 cluster + pgvector extension, Secrets Manager secret, subnet group               |
| `lambda_backend` | 6 Lambda functions (same ECR image, different CMD handlers), IAM role + policy, CloudWatch log groups |
| `api_gateway`    | HTTP API v2, `ANY /{proxy+}` route, Lambda integration, CORS, throttling                              |
| `websocket`      | WebSocket API, `$connect`/`$disconnect`/`$default` routes, binary frame handling                      |
| `s3_frontend`    | S3 bucket, website configuration, public access policy                                                |
| `ecr`            | ECR repository + lifecycle policy                                                                     |
| `iam`            | Lambda execution role with Bedrock, RDS, S3, Transcribe, Polly, Secrets Manager permissions           |
| `cloudfront`     | CloudFront distribution with OAC (optional, `enable_cloudfront=true`)                                 |
| `opensearch`     | OpenSearch Serverless domain (optional, `enable_opensearch=true`, ~$26/month)                         |
| `sagemaker`      | SageMaker Serverless endpoint for embeddings (optional, `enable_sagemaker=true`)                      |

---

## Technology Stack

### Frontend

| Tool          | Version         | Role                                              |
| ------------- | --------------- | ------------------------------------------------- |
| Next.js       | 16 (App Router) | React framework, static export (`output: export`) |
| React         | 19              | UI runtime                                        |
| TypeScript    | 5               | Type safety                                       |
| Tailwind CSS  | 4               | Utility-first styling (OKLCH color space)         |
| shadcn/ui     | New York style  | Component library                                 |
| Recharts      | latest          | Skill radar charts, market trend charts           |
| Framer Motion | latest          | Page transitions, animated results                |
| Axios         | latest          | API client with JWT auto-attach and refresh       |

### Backend

| Tool             | Version | Role                                                           |
| ---------------- | ------- | -------------------------------------------------------------- |
| Python           | 3.11    | Runtime                                                        |
| FastAPI          | latest  | Web framework                                                  |
| Mangum           | latest  | ASGI → Lambda adapter                                          |
| SQLAlchemy       | 2       | ORM                                                            |
| Pydantic         | v2      | Request/response schemas, settings                             |
| python-jose      | latest  | JWT (HS256, access + refresh tokens)                           |
| passlib / bcrypt | latest  | Password hashing (12 rounds)                                   |
| spaCy            | 3.7     | NLP library (installed, reserved for future entity extraction) |
| slowapi          | latest  | Rate limiting middleware                                       |

### AI / ML

| Tool                                                                                 | Role                                                                               |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| **AWS Bedrock — Claude 3.5 Sonnet** (`us.anthropic.claude-3-5-sonnet-20241022-v2:0`) | LLM for career coaching, resume parsing, interview simulation, RAG generation      |
| **AWS Bedrock — Titan Embed Text v1** (`amazon.titan-embed-text-v1`)                 | 1536-dim embeddings for RAG pipeline + pgvector storage                            |
| **Sentence Transformers** (`all-MiniLM-L6-v2`, 384-dim)                              | Local embeddings for FAISS skill taxonomy matching                                 |
| **FAISS**                                                                            | In-memory vector index for skill normalization (cosine similarity, threshold 0.75) |
| **pgvector**                                                                         | PostgreSQL extension in Aurora for RAG document retrieval (`<->` cosine distance)  |
| **AWS Polly**                                                                        | Neural TTS (voice: Matthew) for voice coaching responses                           |
| **AWS Transcribe**                                                                   | Batch speech-to-text for voice coaching input                                      |
| **Google Gemini** (`gemini-2.0-flash`)                                               | Chat fallback when Bedrock is unavailable                                          |

### Infrastructure

| Service                   | Role                                                          |
| ------------------------- | ------------------------------------------------------------- |
| AWS Lambda                | Compute (6 functions, container image, 3008 MB / 120s)        |
| API Gateway HTTP API v2   | REST interface (29s timeout, proxy integration)               |
| API Gateway WebSocket API | Real-time voice coaching (binary frames, `CONVERT_TO_BINARY`) |
| Aurora Serverless v2      | Managed PostgreSQL 16 + pgvector (0.5 ACU min, auto-scaling)  |
| Amazon ECR                | Container image registry (lifecycle: keep last 5)             |
| Amazon S3                 | Frontend static hosting + voice audio temp storage            |
| CloudFront                | CDN with OAC (optional)                                       |
| AWS Secrets Manager       | Aurora credentials (auto-rotatable)                           |
| Amazon Polly              | Neural TTS                                                    |
| Amazon Transcribe         | Batch STT                                                     |

### DevOps

| Tool           | Role                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| Terraform 1.9  | Infrastructure as Code (12 modules)                                         |
| GitHub Actions | CI/CD (manual `workflow_dispatch` only)                                     |
| Docker Buildx  | Multi-platform image build (`linux/amd64`, `--provenance=false` for Lambda) |
| Docker Compose | Local full-stack environment                                                |
| n8n            | Automation workflows (market updates, resume ingestion, notifications)      |

---

## AI & RAG Pipeline

### Dual Embedding Architecture

SkillBridge uses two distinct embedding systems serving different purposes:

```
Resume / Query Text
        │
        ├──► Titan Embed Text v1 (1536-dim)  ──►  pgvector (Aurora)
        │    via AWS Bedrock                        └─► RAG retrieval
        │
        └──► Sentence Transformers (384-dim)  ──►  FAISS (in-memory)
             all-MiniLM-L6-v2 (local)               └─► Skill taxonomy
                                                         normalization
```

**Titan Embed** handles the RAG pipeline — higher dimensionality, cloud-native, stored persistently in Aurora.

**Sentence Transformers** handles real-time skill matching and taxonomy normalization — loaded at Lambda cold start, kept warm in memory.

### RAG Pipeline Flow

```
User Query
     │
     ▼
generate_titan_embedding(query)          ← AWS Bedrock: Titan Embed Text v1
     │  1536-dim vector
     ▼
similarity_search(query_vec, k=5)        ← pgvector: cosine distance (<->)
     │  top-k matching documents         filter by: text_type, profile_id
     ▼
Build context string from results
     │  + source_text from each hit
     ▼
rag_query() → Bedrock Claude 3.5 Sonnet  ← Structured system prompt
     │  max_tokens=1024                      with grounding instructions
     ▼
Response + source embedding IDs          ← Source tracking for attribution
```

**Stored document types (`text_type`):**

- `"resume"` — extracted resume text (ingested via S3 trigger or upload endpoint)
- `"query"` — past user queries (enables personalized retrieval)
- `"jd"` — job description text (from JD match endpoint)

### Vector Storage Schema

```sql
CREATE TABLE embeddings (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER REFERENCES users(id),
    profile_id   INTEGER REFERENCES user_profiles(id),
    text_type    VARCHAR(50) NOT NULL,  -- 'resume' | 'query' | 'jd'
    embedding    VECTOR(1536),          -- pgvector column
    source_text  VARCHAR(4000),         -- raw text that was embedded
    metadata     JSONB,                 -- e.g. {s3_key, bucket}
    created_at   TIMESTAMP DEFAULT now()
);
-- Retrieval: ORDER BY embedding <-> CAST(:vec AS vector) LIMIT :k
```

### Hallucination Prevention

The RAG pipeline uses three complementary mechanisms to reduce hallucinated responses:

**1. Retrieval-Grounded Context Injection**

The system prompt explicitly instructs the model to base its answer on retrieved documents only:

```
"Use the retrieved context below to answer the user's question accurately
 and concisely. If the context doesn't contain enough information, say so
 honestly rather than speculating."
```

**2. Structured Profile Context (Career Coach)**

Every chat request injects the user's verified data into the system prompt:

- Full profile (skills, experience, education, age)
- Top 3 recommended roles with match scores
- Key skill gaps with severity labels
- SCTP learning pathways (from database, not hallucinated)
- Live Singapore market insights (sorted by YoY growth)
- MCES eligibility context for users aged 40+

This grounds every LLM response in real, user-specific, database-backed data.

**3. Source Attribution**

Every RAG response returns `sources: [embedding_ids]`, enabling callers to trace exactly which stored documents informed the answer.

### Lambda Functions

All six Lambda functions share a single ECR container image. Handler selection is via CMD override:

| Function              | Handler                                  | Timeout | Memory  | Purpose                            |
| --------------------- | ---------------------------------------- | ------- | ------- | ---------------------------------- |
| `{env}-api`           | `lambda_handler.handler`                 | 120s    | 3008 MB | Main FastAPI app (all HTTP routes) |
| `{env}-voice`         | `lambdas.voice_coaching_handler.handler` | 120s    | 3008 MB | WebSocket voice pipeline           |
| `{env}-rag-query`     | `lambdas.rag_query_handler.handler`      | 30s     | 3008 MB | Direct RAG query invocation        |
| `{env}-embed-gen`     | `lambdas.embedding_generator.handler`    | 30s     | 3008 MB | Store new embeddings in pgvector   |
| `{env}-gap-analysis`  | `lambdas.gap_analysis_handler.handler`   | 60s     | 3008 MB | Skill gap computation              |
| `{env}-resume-upload` | `lambdas.resume_upload_handler.handler`  | 30s     | 3008 MB | S3-triggered resume processing     |

> The 3008 MB allocation is required to load Sentence Transformer + FAISS models at cold start within Lambda's memory constraints.

### Voice Coaching Pipeline

```
Client (browser/app)
     │  binary audio frame over WebSocket
     ▼
API Gateway WebSocket → Lambda (voice)
     │
     ├──► S3 upload (audio file, temp storage)
     │
     ├──► AWS Transcribe (batch job, poll up to 25s)
     │         └─► transcript string
     │
     ├──► Career coach LLM (reuses chat router with profile context)
     │         └─► coaching response text
     │
     └──► AWS Polly (neural TTS, voice: Matthew)
              └─► MP3 bytes (base64-encoded)
                       │
                       ▼
              WebSocket response to client:
              { transcript, response_text, audio_base64, audio_format }
```

---

## Features

### Resume Intelligence

- **AI Resume Parsing** — PDF/DOCX upload (10 MB limit) processed by Claude 3.5 Sonnet via AWS Bedrock; returns structured analysis: skills list, readiness score (0–100), strengths, missing skills, suggested roles, recommended courses
- **Keyword Fallback** — If Bedrock is unavailable, spaCy-ready taxonomy keyword matching ensures skills are always extracted
- **Embedding Storage** — Resume text is embedded via Titan Embed and stored in pgvector for RAG retrieval

### Job Matching

- **Hybrid Scoring** — `0.55 × content_similarity + 0.25 × rule_match + 0.20 × career_switcher_bonus`
- **Recommendation Cache** — In-memory TTL cache (300s) prevents redundant scoring on repeated requests
- **JD Match** — Paste any job description; instantly get match score, matched skills, missing skills, and a severity-ranked gap table

### Skill Gap Analysis

- **Per-Role Gaps** — Severity-ranked gap items (`high` / `medium` / `none`) for each recommended role
- **FAISS Taxonomy** — 150+ canonical skills, normalized from free-text via in-memory cosine similarity (threshold 0.75)
- **Radar Visualization** — Recharts radar chart on the dashboard showing skill breadth

### AI Career Coach

- **Context-Aware Chat** — LLM knows your full profile, skill gaps, SCTP courses, and live Singapore market data before answering
- **Engine priority:** Google Gemini (primary) → AWS Bedrock Claude 3.5 Sonnet (fallback) → HTTP 503
- **Multi-turn Conversation** — Full message history sent on every request; persistent across page navigation
- **RAG-Augmented Responses** — Career coach can draw from your stored resume embeddings via the RAG pipeline

### Mock Interview Simulator

- **Role-specific questions** generated by Bedrock Claude, targeting your identified skill gaps
- **Configurable difficulty** — `beginner`, `intermediate`, `advanced`
- **Multi-turn session** — Tracks question number and conversation history

### Voice Coaching

- **Real-time WebSocket session** — Low-latency audio-in, audio-out over `wss://`
- **AWS Transcribe** for speech-to-text, **AWS Polly** (neural, Matthew voice) for text-to-speech
- **REST fallback** — `POST /api/voice/interview_turn` for file-upload voice turns

### Learning & Pathways

- **SCTP Course Database** — 25 validated SkillsFuture Career Transition Programme courses
- **Subsidy Calculator** — MCES (90% for age 40+), SkillsFuture Credit ($500), Training Allowance ($6,000) computed per course
- **Learning Pathways** — Skill → Beginner course → Advanced course, scoped to your specific gaps

### Market Intelligence

- **Singapore 2026 Benchmarks** — 6 role categories (Data & Analytics, Software Engineering, Cloud & DevOps, AI/ML, Cybersecurity, Product) with avg SGD salary, YoY growth %, and demand level
- **Market Simulator** — Stochastic daily fluctuation simulation with trend injection (±5% randomness)
- **Peer Comparison** — Anonymized cohort benchmarking against users with similar profiles

### Progress & Portfolio

- **ProfileSnapshot model** — Point-in-time records of skills count, gap count, readiness score for historical tracking
- **Project Suggestions** — LLM-generated portfolio project ideas scoped to your gap skills
- **Resume Rewriter** — Rewrites resume bullet points for target role impact
- **PDF Export** — Roadmap export via WeasyPrint

---

## Deployment

### Prerequisites

1. **AWS account** with IAM permissions for: Lambda, API Gateway, ECR, Aurora/RDS, S3, Bedrock, Polly, Transcribe, Secrets Manager, VPC, CloudWatch, IAM

2. **Enable Bedrock model access** — this is a one-time manual step:
   - Open [AWS Bedrock → Model access](https://console.aws.amazon.com/bedrock/home#/modelaccess)
   - Request **Anthropic → Claude 3.5 Sonnet v2** and **Amazon → Titan Embeddings Text v1**
   - Approval is typically instant
   - Without this step, all Bedrock calls return `ValidationException: Operation not allowed`

3. **Use cross-region inference profile ID** (not the direct model ID):

   ```
   # Correct (cross-region inference profile — ACTIVE)
   BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0

   # Wrong (direct model ID — returns Operation not allowed)
   BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
   ```

4. **GitHub repository secrets** (set in repo → Settings → Secrets → Actions, environment: `dev`):

   | Secret                  | Value                                                                    |
   | ----------------------- | ------------------------------------------------------------------------ |
   | `AWS_ACCESS_KEY_ID`     | IAM user access key                                                      |
   | `AWS_SECRET_ACCESS_KEY` | IAM user secret key                                                      |
   | `DB_PASSWORD`           | Aurora master password (alphanumeric only — no `/`, `@`, `"`, or spaces) |
   | `SECRET_KEY`            | JWT signing secret (min 32 hex chars: `openssl rand -hex 32`)            |
   | `GEMINI_API_KEY`        | Google AI Studio API key (optional, used as chat fallback)               |

### CI/CD via GitHub Actions

The deployment workflow is **manually triggered** — it does not auto-run on push.

```bash
# Full deploy — recreates all AWS infrastructure from scratch (~30 min)
# Use when: first deploy, infrastructure changes, Terraform module updates
gh workflow run deploy-serverless.yml \
  -f environment=dev \
  -f skip_terraform=false

# Fast deploy — updates Lambda image + frontend only (~5 min)
# Use when: code changes only, no infrastructure changes
gh workflow run deploy-serverless.yml \
  -f environment=dev \
  -f skip_terraform=true
```

**What the workflow does (full deploy):**

| Step | Action                                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | Create ECR repository (import if exists)                                                                              |
| 2    | Build Docker image (`linux/amd64`, `--provenance=false`) and push to ECR                                              |
| 3    | Clean up existing AWS resources (Aurora, Lambda, API GW, VPC, ENIs, NAT GW) — with retry loops and 15-min Aurora wait |
| 4    | Re-import ECR into Terraform state                                                                                    |
| 5    | `terraform plan` then `terraform apply` — full infrastructure rebuild                                                 |
| 6    | Build Next.js static export with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_VOICE_WS_URL` baked in                        |
| 7    | S3 sync (3 passes: immutable JS/CSS → no-cache HTML → extension-less routing copies)                                  |
| 8    | CloudFront invalidation (if `enable_cloudfront=true`)                                                                 |
| 9    | Smoke test: poll `/health` up to 30×10s (5 min) for Lambda cold start + DB init                                       |

**S3 routing strategy (Pass 3):** Next.js static export generates flat `login.html` files. S3 website hosting only serves `/login.html` at the exact key, not at `/login`. Pass 3 copies each route HTML to an extension-less key (`login.html` → `login`) with `Content-Type: text/html` so clean URLs work without CloudFront.

### Manual Terraform Deployment

```bash
# Generate secure secrets
export TF_VAR_db_password="$(openssl rand -hex 24)"
export TF_VAR_secret_key="$(openssl rand -hex 32)"

# Run end-to-end: ECR → Docker build/push → Terraform → S3 sync
bash scripts/deploy-serverless.sh dev

# Step-by-step
cd terraform
terraform init \
  -backend-config="bucket=skillbridge-tfstate-<account-id>-dev" \
  -backend-config="key=dev/terraform.tfstate" \
  -backend-config="region=us-east-1"

terraform apply -var="lambda_image_uri=<ecr_url>:<tag>"

# Read outputs
terraform output -raw api_endpoint
terraform output -raw frontend_url
terraform output -raw websocket_endpoint
```

### Pause Between Demos (Cost Saving)

```bash
# Destroy NAT Gateway ($32/month) — Lambda still works via VPC endpoints
terraform destroy \
  -target='module.vpc.aws_nat_gateway.main' \
  -target='module.vpc.aws_eip.nat'
```

---

## Local Development

### Quick Start (Docker Compose)

```bash
git clone https://github.com/azniosman/dsai-capstone.git
cd dsai-capstone
cp .env.example .env        # fill in secrets
bash scripts/deploy.sh      # wraps: docker compose up -d --build
```

| Service              | URL                        |
| -------------------- | -------------------------- |
| Frontend             | http://localhost:3000      |
| Backend + Swagger UI | http://localhost:8000/docs |
| n8n Automation       | http://localhost:5678      |

### Backend (standalone)

```bash
cd backend
pip install -r requirements.txt
python -m spacy download en_core_web_sm   # required at startup

# Start dev server
uvicorn app.main:app --reload             # http://localhost:8000

# Tests (SQLite in-memory, no database required)
pytest                                    # all tests
pytest tests/test_recommender.py -v      # single module
pytest tests/test_recommender.py::test_match_score -v  # single test
```

### Frontend (standalone)

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000 (hot reload)
npm run lint       # ESLint check
npm run build      # production build
```

### Environment Variables

```ini
# ── Database ────────────────────────────────────────────────────
POSTGRES_USER=skillbridge
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=skillbridge
# Or override entirely:
# DATABASE_URL=postgresql://user:pass@host:5432/db

# ── Security ────────────────────────────────────────────────────
SECRET_KEY=your_64_char_hex_secret_here

# ── AI — Primary (AWS Bedrock) ──────────────────────────────────
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
# ^ Must use cross-region inference profile ID (us.anthropic…)
# ^ Requires model access enabled in AWS Bedrock console

# ── AI — Fallback (Google Gemini) ───────────────────────────────
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash

# ── ML Models ───────────────────────────────────────────────────
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
# Models are pre-downloaded in Docker image; HF_HUB_OFFLINE=1 in Lambda

# ── Voice Coaching ──────────────────────────────────────────────
VOICE_TRANSCRIBE_BUCKET=skillbridge-dev-voice-tmp   # S3 for audio staging
NEXT_PUBLIC_VOICE_WS_URL=wss://<api-id>.execute-api.us-east-1.amazonaws.com/dev

# ── Frontend (build-time) ───────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_OUTPUT=export                      # set for static S3 export

# ── Optional Extensions ─────────────────────────────────────────
SAGEMAKER_EMBEDDING_ENDPOINT=           # SageMaker serverless embeddings
OPENSEARCH_HOST=                        # Enterprise vector search
OPENSEARCH_USERNAME=
OPENSEARCH_PASSWORD=
```

### Seed Database

```bash
# Populate skills taxonomy, job roles (SGD benchmarks), SCTP courses
python data/scripts/seed_db.py
```

### Integration Test Suite

```bash
# Against local backend
python scripts/full_test.py

# Against live AWS deployment (20 endpoints)
sed 's|http://localhost:8000|https://<api-endpoint>|' scripts/full_test.py \
  | python3
```

---

## API Reference

All endpoints are prefixed `/api`. The main Lambda handler routes all requests through FastAPI.

### Authentication

| Method | Path                 | Description                                                                                             |
| ------ | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/auth/register` | Register user — body: `{email, password, password_confirm, name, tenant_name}`                          |
| `POST` | `/api/auth/login`    | Login — **form-encoded** (`application/x-www-form-urlencoded`), returns `{access_token, refresh_token}` |
| `GET`  | `/api/auth/me`       | Current user info — requires Bearer token                                                               |

> Auth is **optional** for core features. Profile creation, recommendations, and skill gap analysis work without a token. When a token is present, data is scoped to the authenticated user + tenant.

### Profile & Resume

| Method | Path                 | Description                                                                                     |
| ------ | -------------------- | ----------------------------------------------------------------------------------------------- |
| `POST` | `/api/profile`       | Create/update profile — `{name, education, years_experience, skills, resume_text, …}`           |
| `GET`  | `/api/profile/me`    | Fetch authenticated user's profile                                                              |
| `POST` | `/api/upload-resume` | Upload PDF/DOCX (multipart) — returns `{skills, readiness_score, strengths, missing_skills, …}` |
| `POST` | `/api/jd-match`      | Match profile against job description — returns match score, gaps, matched/missing skills       |

### AI Features

| Method | Path                            | Description                                                                                           |
| ------ | ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `POST` | `/api/chat`                     | Career coach — body: `{profile_id?, messages: [{role, content}]}` — returns `text/event-stream` (SSE) |
| `POST` | `/api/interview`                | Mock interview — body: `{profile_id, role_title, messages, difficulty}`                               |
| `POST` | `/api/resume/rewrite`           | Rewrite bullet point — body: `{target_role, bullet_point}`                                            |
| `GET`  | `/api/project-suggestions/{id}` | Portfolio project ideas for a profile                                                                 |
| `POST` | `/api/voice/interview_turn`     | Voice interview turn (file upload → transcribe → respond → TTS)                                       |
| `POST` | `/api/voice/speak`              | Text-to-speech only (returns MP3)                                                                     |

### Recommendations & Analysis

| Method | Path                        | Description                                       |
| ------ | --------------------------- | ------------------------------------------------- |
| `POST` | `/api/recommend`            | Hybrid job recommendations — body: `{profile_id}` |
| `GET`  | `/api/skill-gap/{id}`       | Severity-ranked skill gaps per recommended role   |
| `GET`  | `/api/upskilling/{id}`      | Personalized upskilling roadmap                   |
| `GET`  | `/api/roles`                | All 50 job roles with SGD salary benchmarks       |
| `POST` | `/api/compare-roles`        | Side-by-side multi-role comparison                |
| `GET`  | `/api/peer-comparison/{id}` | Anonymized cohort benchmarking                    |

### Market & Courses

| Method | Path                     | Description                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| `GET`  | `/api/market-insights`   | Singapore 2026 salary + demand data              |
| `POST` | `/api/simulate`          | Run market stochastic simulator                  |
| `GET`  | `/api/courses`           | SCTP courses with fee, subsidy, and nett payable |
| `POST` | `/api/pathways`          | Learning pathways — body: `{skills_needed: []}`  |
| `POST` | `/api/calculate-subsidy` | Calculate MCES/SFC subsidy for a course          |

### Progress & Export

| Method | Path                          | Description                      |
| ------ | ----------------------------- | -------------------------------- |
| `POST` | `/api/progress`               | Record skill progress checkpoint |
| `GET`  | `/api/progress/{id}`          | Progress dashboard data          |
| `GET`  | `/api/progress/{id}/timeline` | Progress timeline for charting   |
| `GET`  | `/api/export/roadmap/{id}`    | Download roadmap as PDF          |

### System

| Method | Path           | Description                               |
| ------ | -------------- | ----------------------------------------- |
| `GET`  | `/health`      | Health check — returns `{"status": "ok"}` |
| `GET`  | `/api/auth/me` | Auth probe                                |

### WebSocket

```
wss://<api-id>.execute-api.us-east-1.amazonaws.com/dev

Frames:
  Client → Server: binary (5-byte header: profile_id[4] + audio_format[1]) + audio bytes
  Server → Client: JSON { type, transcript, response_text, audio_base64, audio_format }
```

---

## Security

### Authentication & Authorization

- **JWT tokens** (python-jose, HS256): 15-minute access tokens + 7-day refresh tokens
- **Refresh token rotation**: each refresh issues a new pair; old JTI is blacklisted (in-memory OrderedDict, max 10K entries, TTL cleanup)
- **Password hashing**: bcrypt, 12 rounds (passlib)
- **Password policy**: min 8 chars, requires uppercase, lowercase, digit, special character (validated in Pydantic schemas)
- **IDOR protection**: All profile endpoints filter by `user_id` on authenticated requests — users cannot access other users' data

### Multi-tenancy

- Every ORM model includes `tenant_id` (FK to `tenants` table)
- All queries filter by `tenant_id`; a `Global` tenant is auto-created on startup for unauthenticated users

### Infrastructure

- **Private subnets**: Lambda and Aurora run in VPC private subnets with no direct internet access
- **Secrets Manager**: Aurora credentials are never in environment variables — fetched at startup from Secrets Manager
- **IAM least privilege**: Lambda execution role is scoped to only the AWS services it needs (Bedrock, Transcribe, Polly, specific S3 buckets)
- **No PII in LLM training**: Bedrock inference is stateless; no user data is retained by the model provider
- **File upload safety**: 10 MB limit, MIME type allowlist (PDF, DOCX, TXT), chunked read

### Frontend

- **Next.js middleware**: CSP, X-Frame-Options, Permissions-Policy headers on every response
- **Token refresh**: shared Promise prevents race conditions when multiple concurrent requests trigger a 401
- **AbortController**: all in-flight requests cancelled on component unmount (no state updates after unmount)

### Audit

- **Audit logger**: records sensitive operations; detail values truncated at 1000 chars
- **Account deletion**: soft delete only — user is deactivated and PII cleared, no hard delete

---

## Cost Model

| Resource               | Monthly Cost   | Notes                                                                      |
| ---------------------- | -------------- | -------------------------------------------------------------------------- |
| Aurora Serverless v2   | ~$43           | 0.5 ACU minimum; pgvector included                                         |
| NAT Gateway            | ~$32           | Required for Lambda→internet (Bedrock API); can be destroyed between demos |
| Lambda                 | ~$0–2          | Pay-per-invocation; negligible at demo scale                               |
| S3 + CloudFront        | ~$1–5          | Frontend static hosting                                                    |
| ECR                    | ~$0.50         | Container image storage                                                    |
| **Total (with NAT)**   | **~$80/month** |                                                                            |
| **Total (paused NAT)** | **~$48/month** | Pause when not presenting                                                  |

```bash
# Pause NAT Gateway between demos
terraform destroy \
  -target='module.vpc.aws_nat_gateway.main' \
  -target='module.vpc.aws_eip.nat'
```

---

## Future Improvements

Based on the current architecture and codebase roadmap:

- **OpenSearch integration** — The Terraform `opensearch` module is implemented and togglable (`enable_opensearch=true`). Replacing pgvector with OpenSearch Serverless would enable hybrid BM25 + vector search and better scalability beyond 100K documents
- **SageMaker embeddings** — The `sagemaker_service.py` and Terraform module are implemented. Enabling `enable_sagemaker=true` moves Sentence Transformer inference to a dedicated endpoint, reducing Lambda cold-start time and memory pressure
- **ECS Fargate migration** — The Terraform `ecs` module exists. Moving the main API from Lambda to ECS removes the 29-second API Gateway integration timeout constraint and enables true SSE streaming to the browser
- **CloudFront + WAF** — CloudFront distribution is implemented; WAF integration would add rate limiting at the edge and protect against layer-7 attacks
- **Bedrock Knowledge Base** — Replace the custom pgvector RAG implementation with a managed Bedrock Knowledge Base backed by OpenSearch Serverless for simpler maintenance
- **OIDC-based CI/CD** — Replace static IAM keys in GitHub Actions with OIDC role assumption for keyless deployments
- **Alembic migrations** — Currently, simple column additions use the `_sync_schema()` auto-ALTER path in `main.py`. Structural schema changes should migrate to full Alembic migration management
- **Token refresh persistence** — The JTI blacklist is currently in-memory (lost on Lambda restart). A Redis or DynamoDB-backed blacklist would make token revocation durable across cold starts

---

## Project Structure

```
dsai-capstone/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry — startup lifecycle: schema sync,
│   │   │                        # ML warmup, FAISS index build, DB seeding
│   │   ├── config.py            # pydantic_settings.BaseSettings (all env vars)
│   │   ├── auth.py              # JWT utilities (access + refresh + JTI blacklist)
│   │   ├── database.py          # SQLAlchemy engine (pool_size=5, pre_ping=True)
│   │   ├── routers/             # auth, profile, recommend, skill_gap, upskilling,
│   │   │                        # chat, interview, jd_match, resume_rewriter,
│   │   │                        # upload, market, courses, compare, progress,
│   │   │                        # projects, peer, voice, dashboard, export …
│   │   ├── services/            # recommender, gap_analyzer, resume_parser,
│   │   │                        # bedrock_service, rag_service, voice_service,
│   │   │                        # roadmap_generator, course_pathways,
│   │   │                        # subsidy_calculator, market_simulator,
│   │   │                        # audit_logger, dashboard_service …
│   │   ├── ml/
│   │   │   ├── embeddings.py    # Titan Embed (1536-dim) + Sentence Transformers (384-dim)
│   │   │   └── taxonomy.py      # FAISS skill taxonomy (150+ skills, cosine 0.75 threshold)
│   │   └── models/              # SQLAlchemy ORM: users, tenants, user_profiles,
│   │                            # market_insights, courses, embeddings, snapshots …
│   ├── lambdas/                 # Standalone Lambda handlers (same image, different CMD)
│   │   ├── rag_query_handler.py
│   │   ├── embedding_generator.py
│   │   ├── resume_upload_handler.py
│   │   ├── voice_coaching_handler.py
│   │   └── gap_analysis_handler.py
│   ├── tests/                   # pytest (SQLite in-memory fixtures)
│   └── Dockerfile.lambda        # Pre-downloads spaCy en_core_web_sm + HF models;
│                                # sets HF_HUB_OFFLINE=1 for private subnet compatibility
├── frontend/
│   ├── app/                     # 18 App Router pages
│   ├── components/
│   │   ├── ui/                  # shadcn primitives (Card, Badge, Button variants)
│   │   └── layout/              # AppShell, SidebarNav, PageHeader
│   └── lib/
│       ├── api-client.ts        # Axios instance (JWT auto-attach, refresh, redirect)
│       └── api.ts               # Typed service layer (all entity types + API functions)
├── terraform/
│   ├── main.tf                  # Module wiring
│   ├── variables.tf             # All input variables with defaults
│   ├── outputs.tf               # api_endpoint, frontend_url, websocket_endpoint …
│   └── modules/                 # vpc, database, lambda_backend, api_gateway,
│                                # websocket, s3_frontend, ecr, iam, cloudfront,
│                                # opensearch (opt), sagemaker (opt), rds, alb, ecs
├── .github/workflows/
│   └── deploy-serverless.yml    # Manual dispatch CI/CD (workflow_dispatch)
├── scripts/
│   ├── deploy-serverless.sh     # Local Terraform + build + S3 sync wrapper
│   └── full_test.py             # 20-endpoint integration test suite
├── n8n/workflows/               # market_simulation, resume_ingestion,
│                                # analysis_notification
├── data/seed/                   # skills_taxonomy.json (150+ skills)
│                                # job_roles.json (SGD salary benchmarks)
│                                # sctp_courses.json (25 SCTP courses + subsidies)
└── docker-compose.yml           # Local: pgvector/pgvector:pg16, backend, frontend, n8n
```

---

## License

MIT — see `LICENSE`.

---

_SkillBridge — Empowering Singapore's Workforce_
