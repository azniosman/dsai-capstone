# SkillBridge 🚀

**AI-Driven Career Intelligence for Singapore's SCTP Learners & Career Switchers**

SkillBridge is a comprehensive career acceleration platform designed to bridge the gap between current skills and future-ready tech roles. Leveraging advanced AI, real-time market data, and the SkillsFuture Singapore (SSG) framework, it provides personalized upskilling pathways, job recommendations, and interactive career coaching.

![Overview](misc/images/aioverview.png)

View the [Technical Roadmap](Enterprise-Technical_Roadmap.md) for SkillBridge.

---

## ✨ Key Features

### 🧠 Intelligent Analysis

- **Smart Resume Parsing**: Upload your resume text for instant skill extraction using **Google Gemini AI**.
- **Hybrid Job Matching**: Advanced ranking algorithm combining content similarity (Sentence Transformers) with rule-based heuristics to find your perfect fit.
- **Skill Gap Visualization**: Interactive radar charts and detailed breakdowns of missing skills for every target role.

### 👤 Comprehensive Profile Management

- **Full Control**: Create and edit your professional profile including experience, education, and skills.
- **AI-Assisted**: Auto-populate your skills from your resume text with a single click.
- **Privacy-First**: Securely manage your data and visibility.

### 📈 Real-Time Market Insights

- **Live Market Simulator**: Tracks daily fluctuations in salary, hiring volume, and demand for Singapore's tech sector.
- **2026 Trends**: benchmarks against projected growth sectors (AI, Cybersecurity, Cloud) to guide your career decisions.

### 🎓 Personalized Learning

- **SCTP Pathways**: Automatically generates structured learning paths (Beginner → Advanced) using validated SkillsFuture Career Transition Programme courses.
- **Subsidy Calculator**: Real-time calculation of course fees, including MCES (90% subsidy for age 40+) and SkillsFuture Credit offsets.

### 🤖 AI Career Coach

- **Context-Aware Chat**: Interactive LLM chatbot that "knows" your profile, skill gaps, and local market trends.
- **Mock Interview Simulator**: Practice role-specific questions generated based on your actual weak points.
- **Resume Optimizer**: AI-powered suggestions to rewrite bullet points for maximum impact.

### ⚡ Automation & Experience

- **Seamless Onboarding**: "Guest Mode" allows instant value exploration before account creation.
- **n8n Workflows**: Automated pipelines for resume ingestion, market data updates, and notification triggers.

---

## 🛠️ Technology Stack

| Domain         | Technologies                                                                  |
| -------------- | ----------------------------------------------------------------------------- |
| **Frontend**   | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui        |
| **Backend**    | Python 3.9+, FastAPI, SQLAlchemy 2.0, Pydantic                                |
| **AI / ML**    | PyTorch, Sentence Transformers (`all-MiniLM-L6-v2`), FAISS, Google Gemini API |
| **Database**   | PostgreSQL 16                                                                 |
| **Automation** | n8n, Docker Compose                                                           |
| **DevOps**     | Docker, Shell Scripts                                                         |

---

## 🚀 Getting Started

### Prerequisites

- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop/)
- [Gemini API Key](https://aistudio.google.com/) (Optional, for full AI features)

### Quick Start (Docker)

The easiest way to run the full stack (Frontend, Backend, DB, Automation) is via Docker.

1. **Clone the repository**

   ```bash
   git clone https://github.com/azniosman/dsai-capstone.git
   cd dsai-capstone
   ```

2. **Configure Environment**

   ```bash
   cp .env.example .env
   # Edit .env to add your GEMINI_API_KEY
   ```

3. **Launch the Application**

   ```bash
   # Starts all services in detached mode
   bash scripts/deploy.sh
   ```

4. **Access the App**
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **n8n Automation**: [http://localhost:5678](http://localhost:5678)

---

## 💻 Development Setup

If you prefer to run services locally for development:

### Backend

```bash
cd backend
# Create environment
conda create -n skillbridge python=3.11 -y && conda activate skillbridge
pip install -r requirements.txt

# Run Server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Access at http://localhost:3000
```

### Seeding Data

Populate the database with Singapore market data, job roles, and SCTP courses:

```bash
# From root directory
python data/scripts/seed_db.py
```

---

## 🏗️ Technical Architecture Strategy

SkillBridge adopts a dual-architecture strategy to demonstrate both rapid, cost-effective prototyping (Capstone) and scalable enterprise vision (Roadmap).

### 1. Current Implementation: Capstone Demo (Serverless)

**Goal**: Maximize "Wow" factor while minimizing idle costs ($~45/mo).

- **Core**: AWS Lambda (Python/FastAPI) + API Gateway.
- **Data**: Amazon Aurora Serverless v2 + `pgvector` (Vector Search).
- **AI**: AWS Bedrock (Claude 3.5 Sonnet) & SageMaker Serverless Inference.
- **Frontend**: S3 Static Hosting + CloudFront CDN.

👉 **[View Capstone Demo Documentation](Capstone-Demo.md)** for full architecture, features, and walkthrough.

### 2. Target End State: Enterprise Technical Roadmap

**Goal**: High-throughput, compliance-ready microservices architecture for 100k+ users.

- **Core**: Amazon ECS (Fargate) for long-running containerized services.
- **Search**: OpenSearch Serverless for massive-scale vector retrieval.
- **Event Bus**: EventBridge for asynchronous decoupling of resume parsing and notifications.
- **Security**: WAF, Shield, and PrivateLink for banking-grade security.

👉 **[View Enterprise Technical Roadmap](Enterprise-Technical_Roadmap.md)** to see the future vision.

---

## ☁️ Deployment Guide

### Deploying the Current Serverless Stack

The repository currently contains the Terraform code for the **Capstone Demo (Serverless)** architecture.

1. **Build Lambda Package**:
   ```bash
   ./scripts/build_lambda.sh
   ```
2. **Provision Infrastructure**:
   ```bash
   cd terraform
   terraform init
   terraform apply
   ```
3. **CI/CD**:
   Push to `main` to trigger the GitHub Actions workflow defined in `.github/workflows/deploy-serverless.yml`.

For detailed deployment steps, see **[Walkthrough.md](Walkthrough.md)**.

## 📂 Project Structure

```text
dsai-capstone/
├── backend/ # FastAPI Application
│ ├── app/
│ │ ├── routers/ # API Endpoints (Auth, Market, Jobs, AI)
│ │ ├── services/ # Business Logic (Pathways, Simulator)
│ │ ├── models/ # SQLAlchemy ORM Models
│ │ └── ml/ # AI Models (FAISS, Embeddings)
├── frontend/ # Next.js Application
│ ├── app/ # App Router Pages
│ └── components/ # Reusable UI Components
├── terraform/ # Infrastructure as Code
│ ├── modules/ # Reusable Terraform Modules
│ └── main.tf # Main Configuration
├── scripts/ # Deployment & Utility Scripts
├── n8n/ # Automation Workflows
│ └── workflows/ # JSON Workflow exports
├── data/ # Seed Data & Scripts
└── docker-compose.yml # Container Orchestration

```

---

## 🛡️ Configuration

Create a `.env` file in the root directory:

```ini
# Core
ENVIRONMENT=development
SECRET_KEY=your_secure_random_key_here

# Database
POSTGRES_USER=capstone
POSTGRES_PASSWORD=changeme
POSTGRES_DB=capstone
DATABASE_URL=postgresql://capstone:changeme@db:5432/capstone

# AI Services
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**SkillBridge** — Empowering Singapore's Workforce 🇸🇬
