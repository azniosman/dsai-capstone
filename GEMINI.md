# SkillBridge — Project Overview & Context

SkillBridge is an AI-powered career intelligence platform designed for Singapore's SCTP (SkillsFuture Career Transition Programme) learners and career switchers. It provides personalized career guidance, skill gap analysis, and upskilling roadmaps grounded in real Singapore market data.

## 🏗 Architecture Summary

The platform follows a modern, serverless-first architecture on AWS:

- **Backend:** NestJS 11 (TypeScript) running on AWS Lambda via `aws-serverless-express`.
- **Database:** Aurora Serverless v2 (PostgreSQL 16) with `pgvector` for vector similarity search.
- **Frontend:** Next.js 16 (App Router) with Tailwind CSS 4, deployed as a static export to S3/CloudFront.
- **AI/LLM:** Multi-provider fallback orchestration (Groq → Anthropic → Google) managed by a unified `LlmService`.
- **RAG Pipeline:** Hybrid search combining semantic (pgvector HNSW) and keyword (tsvector GIN) retrieval with Reciprocal Rank Fusion (RRF).
- **Automation:** EventBridge-triggered Python Lambdas for background tasks (syncing SkillsFuture data, embedding backfill, etc.).

## 🚀 Key Commands

### Backend (`nestjs-backend/`)
- `npm install` — Install dependencies.
- `npm run start:dev` — Start the NestJS development server with watch mode on port 8000.
- `npm run build` — Compile TypeScript to production-ready JavaScript in `dist/`.
- `npm run test` — Run Jest unit tests.
- `npm run lint` — Run ESLint with automatic fixing.

### Frontend (`frontend/`)
- `npm install` — Install dependencies.
- `npm run dev` — Start the Next.js development server on port 3000.
- `npm run build` — Create a production build (static export).
- `npm run lint` — Run Next.js linting.

### Infrastructure & Deployment
- `docker compose up` — Spin up the full local stack (PostgreSQL, Backend, Frontend, n8n).
- `gh workflow run deploy-serverless.yml` — Deploy the stack to AWS via GitHub Actions.
- `terraform apply` — Manually apply infrastructure changes from the `terraform/` directory.

## 🛠 Development Conventions

### TypeScript & Coding Style
- **Strict Typing:** Avoid `any`. Use Zod for schema validation where possible.
- **Naming:** `PascalCase` for classes, `camelCase` for variables/functions, `kebab-case` for files.
- **Functional Approach:** Prefer arrow functions for simple operations and higher-order functions (map, filter, reduce).
- **Early Returns:** Use early returns to minimize nesting and improve readability.

### Backend Patterns (NestJS)
- **Modular Architecture:** Group logic into feature modules (e.g., `auth`, `rag`, `intelligence`).
- **MikroORM:** Use MikroORM for database interactions. Schema updates are additive-only and run automatically on cold starts.
- **DTOs:** Use `class-validator` decorators on DTOs for strict input validation.
- **Error Handling:** Global `AllExceptionsFilter` handles exceptions and prevents stack trace leakage in production.

### AI & LLM Guidelines
- **Fallback Logic:** Always utilize the `LlmService` to ensure high availability across providers.
- **RAG Integration:** When adding features requiring context, utilize `RagService.query()` to inject relevant document chunks.
- **Prompt Engineering:** Keep prompts concise and specific to the Singapore career context (SkillsFuture, WSG).

### Automation & Python
- **Internal Endpoints:** Background tasks should use `/internal/*` routes, which are protected by `InternalTokenGuard` and invoked via Lambda Invoke API.
- **Metrics:** Use the `emit_metric` utility in Python Lambdas to publish custom CloudWatch metrics for monitoring.

## 📂 Project Structure Highlights
- `nestjs-backend/src/intelligence/`: Core AI logic (chat, recommendations, skill gap).
- `nestjs-backend/src/rag/`: Vector embedding and hybrid retrieval pipeline.
- `frontend/app/`: Next.js App Router pages and layouts.
- `lambdas/automation/`: Python scripts for scheduled background jobs.
- `terraform/`: Infrastructure modules for AWS provisioning.
- `data/seed/`: Reference data for skills taxonomy and course catalogs.
