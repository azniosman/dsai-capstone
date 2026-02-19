# SkillBridge AI — Technical Roadmap

## 1. Strategic Vision and Roadmap Overview

SkillBridge AI is evolving from a localized MVP into a **production-grade career intelligence ecosystem** designed for Singapore’s **SkillsFuture Career Transition Programme (SCTP)** learners and career switchers.

The strategic objective is to provide:

- Hyper-personalized career pathways
- Real-time labor market intelligence
- Accurate skill gap analysis
- Personalized upskilling recommendations aligned with SkillsFuture Singapore (SSG)

This evolution replaces static data pipelines and basic LLM prompting with a **resilient, Retrieval-Augmented Generation (RAG)-driven architecture** built for scale, accuracy, and production reliability.

---

## 2. Current State vs Target Production State

| Component | Current State (MVP) | Target Production State |
|----------|--------------------|------------------------|
| Data Ingestion | Static `seed_db.py` scripts | Live API Gateway (SSG, LinkedIn, Adzuna) |
| Market Intelligence | Simulated live market script | Real-time automated n8n pipelines |
| NLP Pipeline | spaCy (`en_core_web_sm`) | Transformer-based custom SG job parser |
| Embedding Model | `all-MiniLM-L6-v2` | BGE-M3 or OpenAI `text-embedding-3-large` |
| LLM Orchestration | Basic Gemini 2.0 Flash | Multi-agent RAG with reranking |
| Vector Storage | Local FAISS index | AWS OpenSearch Serverless (Vector Engine) |
| Infrastructure | Single-node Docker Compose | Multi-AZ AWS ECS Fargate + Aurora |
| Security | `.env` files | AWS Secrets Manager + PDPA compliance |

---

## 3. Phase 1 — Data Expansion and Real-Time Infrastructure

### Objective
Build an enterprise-grade, real-time data backbone.

### Key Initiatives

#### 3.1 Replace Static Seeding Workflow

- Deprecate manual `seed_db.py`
- Replace with automated data ingestion pipelines

#### 3.2 Implement Live Market Data Pipelines

Deploy **n8n orchestration workflows**:

**Workflow design:**

```
Job APIs → n8n → FastAPI /market/update endpoint → Vector DB + PostgreSQL
```

**Responsibilities:**

- Fetch job listings
- Track salary trends
- Monitor hiring demand
- Schedule cron-based automated updates

#### 3.3 Integrate SkillsFuture Singapore (SSG) Framework

Integrate SSG API Gateway to ingest:

- Skills Framework (SFw)
- Technical Skills & Competencies (TSCs)
- Critical Core Skills (CCCs)

This ensures alignment with Singapore's national workforce standards.

#### 3.4 Scale Vector Architecture

Migrate from:

```
Local FAISS → AWS OpenSearch Serverless Vector Engine
```

Benefits:

- High availability
- Concurrent query support
- Production scalability
- Managed infrastructure

---

## 4. Phase 2 — Advanced ML Models and Intelligence Layer

### Objective
Improve matching accuracy, coaching relevance, and explainability.

### Key Initiatives

#### 4.1 Upgrade Embedding Models

Replace:

```
all-MiniLM-L6-v2
```

With:

- BGE-M3 (preferred open-source)
- OR OpenAI text-embedding-3-large (highest accuracy)

Benefits:

- Better semantic understanding
- Improved skill-to-job matching
- Higher dimensional precision

---

#### 4.2 Upgrade NLP Pipeline

Transition from spaCy baseline to:

- Transformer-based NER
- Singapore-specific job title recognition
- Industry acronym awareness

Capabilities:

- Accurate resume parsing
- Skill extraction
- Role classification

---

#### 4.3 Implement Multi-Agent RAG Architecture

Transition from simple LLM calls to structured orchestration:

**Architecture Components:**

- Retriever: OpenSearch Vector Engine
- Reranker: BGE-Reranker or Cohere
- Generator: Gemini or equivalent LLM
- Knowledge sources:
  - SkillsFuture courses
  - Job market data
  - User profiles

**Benefits:**

- Reduced hallucinations
- Fact-grounded responses
- Explainable recommendations

---

#### 4.4 Optimize Hybrid Matching System

Current matching:

```
60% semantic similarity
40% rule-based heuristics
```

Enhancements:

- Integrate MLflow or Weights & Biases
- Track model performance
- Dynamically optimize matching weights
- Improve skill gap accuracy

---

## 5. Phase 3 — Feature Enhancements and Feedback Ecosystem

### Objective
Enable continuous learning and user-driven model improvement.

### Key Initiatives

#### 5.1 Implement Feedback Loop System

Capture user corrections from:

- Skill gap analysis
- Resume optimizer
- Career recommendations

Store in:

```
PostgreSQL 16 (Feedback Dataset)
```

Use cases:

- Model retraining
- Heuristic tuning
- Recommendation improvement

---

#### 5.2 Expand Mock Interview Simulator

Integrate voice intelligence:

Options:

- Whisper API
- AWS Transcribe

New capabilities:

- Real-time speech-to-text
- Sentiment analysis
- Weakness detection
- Role-specific feedback

---

#### 5.3 Improve Subsidy and Financial Logic

Enhance financial engine to support:

- MCES subsidy rules (90% subsidy for age ≥ 40)
- SCTP-specific funding caps
- Self-sponsored learners
- Employer-sponsored learners

Goal:

**100% financial calculation accuracy**

---

## 6. Infrastructure, Security, and Scalability

### Objective
Deploy secure, resilient, production-grade AWS infrastructure.

### Core Components

#### 6.1 Multi-AZ Production Infrastructure

Deploy using Terraform:

```
AWS ECS Fargate (Compute)
AWS RDS Aurora PostgreSQL (Database)
AWS OpenSearch Serverless (Vector Search)
AWS S3 (Storage)
AWS CloudFront (CDN)
```

Benefits:

- Fault tolerance
- Auto scaling
- High availability

---

#### 6.2 Secrets and Credential Management

Migrate sensitive data to:

```
AWS Secrets Manager
```

Includes:

- API keys
- Database credentials
- External integrations

---

#### 6.3 PDPA Compliance and Data Protection

Implement:

- Encryption at rest
- Encryption in transit
- Secure resume storage
- PII protection policies

Compliance target:

**Singapore Personal Data Protection Act (PDPA)**

---

#### 6.4 CI/CD and Monitoring

CI/CD Pipeline:

- GitHub Actions
- Automated testing
- Automated deployment

Monitoring Stack:

- Prometheus
- Grafana
- Sentry

Metrics monitored:

- API latency
- LLM inference performance
- System health
- Error rates

---

## 7. Timeline and Milestones

### Short-Term Milestones

- [ ] Replace `seed_db.py` with n8n pipelines
- [ ] Integrate SkillsFuture and job APIs
- [ ] Deploy AWS Multi-AZ infrastructure
- [ ] Migrate to Aurora PostgreSQL
- [ ] Migrate vector storage to OpenSearch Serverless
- [ ] Implement AWS Secrets Manager
- [ ] Complete PDPA security hardening

---

### Long-Term Milestones

- [ ] Deploy BGE-M3 or OpenAI embeddings
- [ ] Implement transformer-based NER
- [ ] Launch multi-agent RAG orchestration
- [ ] Implement MLflow or W&B tracking
- [ ] Deploy voice-enabled interview simulator
- [ ] Finalize subsidy calculation engine

---

## 8. Target End-State Architecture Summary

**Core Stack:**

- Backend: FastAPI
- AI: Gemini + RAG Architecture
- Vector DB: OpenSearch Serverless
- Database: Aurora PostgreSQL
- Infrastructure: AWS ECS Fargate
- Storage: S3
- CI/CD: GitHub Actions
- Monitoring: Prometheus + Grafana + Sentry
- Infrastructure as Code: Terraform

---

## 9. Outcome

SkillBridge AI will evolve into a:

- Fully automated
- Production-scale
- AI-powered career intelligence platform

Designed specifically for Singapore’s workforce transformation ecosystem.

