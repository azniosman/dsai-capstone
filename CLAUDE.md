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
- `backend/app/auth.py` — JWT authentication utilities
- `backend/app/routers/` — API endpoints:
  - Core: profile, recommend, skill-gap, upskilling
  - Features: auth, upload, jd_match, progress, chat, interview, market, compare, peer, projects, export
- `backend/app/services/` — Business logic (resume_parser, skill_matcher, recommender, gap_analyzer, roadmap_generator)
- `backend/app/ml/` — ML pipelines (embeddings, taxonomy normalization)
- `backend/app/models/` — SQLAlchemy ORM models (job_role, skill, sctp_course, user_profile, user, skill_progress, market_insight)
- `backend/app/schemas/` — Pydantic request/response schemas
- `frontend/src/pages/` — React pages (ProfileInput, Recommendations, SkillGap, Roadmap, JDMatch, CareerChat, MockInterview, MarketInsights, RoleComparison, PeerComparison, ProjectSuggestions, ProgressDashboard, Login)
- `data/seed/` — Seed JSON data files

## Key Design Decisions

- Hybrid scoring: `0.6 × content_similarity + 0.25 × rule_match + 0.15 × career_switcher_bonus`
- Skill levels: 0 (missing), 0.5 (partial), 1.0 (strong)
- FAISS in-memory for vector similarity search
- LLM chatbot/interview uses OpenAI API when configured, falls back to rule-based responses
- Auth is optional — core features work without login

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
