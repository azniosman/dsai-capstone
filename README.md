# Job Recommendation & Skill Gap Analysis System

A career intelligence platform for SCTP learners and career-switchers in Singapore. Submit your profile or resume to get matched with suitable job roles, understand your skill gaps, and receive a personalized upskilling roadmap.

## Features

- **Profile Analysis** — Extract skills from resume text or manual input
- **Job Recommendations** — Hybrid AI matching with match scores and rationale
- **Skill Gap Analysis** — Per-role breakdown of required vs. current skills
- **Upskilling Roadmap** — Personalized learning plan with SCTP courses and timelines

## Quick Start

```bash
cp .env.example .env
docker compose up
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

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

### Tests

```bash
cd backend
pytest
```

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React, Vite, MUI, Recharts         |
| Backend  | Python, FastAPI, SQLAlchemy         |
| AI/ML    | Sentence Transformers, spaCy, FAISS |
| Database | PostgreSQL                          |
| Deploy   | Docker Compose                      |
