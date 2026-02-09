# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

DSAI Capstone — Job Recommendation & Skill Gap Analysis System for SCTP learners and career-switchers in Singapore.

## Tech Stack

- **Frontend**: React 18 + Vite + MUI 6 + Recharts
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
- `backend/app/routers/` — API endpoints (profile, recommend, skill-gap, upskilling)
- `backend/app/services/` — Business logic (resume_parser, skill_matcher, recommender, gap_analyzer, roadmap_generator)
- `backend/app/ml/` — ML pipelines (embeddings, taxonomy normalization)
- `backend/app/models/` — SQLAlchemy ORM models
- `backend/app/schemas/` — Pydantic request/response schemas
- `frontend/src/pages/` — React pages (ProfileInput, Recommendations, SkillGap, Roadmap)
- `data/seed/` — Seed JSON data files

## Key Design Decisions

- Hybrid scoring: `0.6 × content_similarity + 0.25 × rule_match + 0.15 × career_switcher_bonus`
- Skill levels: 0 (missing), 0.5 (partial), 1.0 (strong)
- FAISS in-memory for vector similarity search
