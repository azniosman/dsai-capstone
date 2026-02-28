# SkillBridge — API Reference

Base URL (local): `http://localhost:8000`
Base URL (AWS): read from `terraform output -raw api_endpoint`

All endpoints are prefixed with `/api`. Auth endpoints use OAuth2 form encoding.
Protected endpoints require `Authorization: Bearer <token>`.

## Auth

| Method | Path | Body / Params | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `username, email, password, password_confirm, tenant_name` | JSON |
| POST | `/api/auth/login` | `username, password` | **form-encoded** (OAuth2) |
| GET | `/api/auth/me` | — | JWT required |

## Profile

| Method | Path | Notes |
|---|---|---|
| POST | `/api/profile` | Create profile with skills, experience, education |
| POST | `/api/upload-resume` | Multipart PDF/DOCX; extracts skills via Gemini |

## Core Flows

| Method | Path | Notes |
|---|---|---|
| POST | `/api/recommend` | Returns top-N job roles with hybrid scores |
| GET | `/api/skill-gap/{profile_id}` | Gap analysis against top-3 recommended roles |
| GET | `/api/upskilling/{profile_id}` | Roadmap with courses, subsidies, optional LLM narrative |
| POST | `/api/jd-match` | Match profile against a pasted job description |

## Market & Insights

| Method | Path | Notes |
|---|---|---|
| GET | `/api/market-insights` | Singapore labor market data (6 sectors) |
| GET | `/api/roles` | List all job roles |
| POST | `/api/compare-roles` | Multi-role side-by-side comparison |

## Progress & Learning

| Method | Path | Notes |
|---|---|---|
| POST | `/api/progress` | Record skill level (0.0 / 0.5 / 1.0) |
| GET | `/api/progress/{profile_id}` | Progress dashboard |
| GET | `/api/progress/{profile_id}/timeline` | Progress over time |
| GET | `/api/courses` | List SCTP courses |
| POST | `/api/calculate-subsidy` | SkillsFuture / MCES subsidy for a course |

## AI Features

| Method | Path | Notes |
|---|---|---|
| POST | `/api/chat` | SSE stream; parse `[ENGINE:...]` prefix |
| POST | `/api/interview` | Mock interview Q&A |
| POST | `/api/voice` | Voice coaching session |
| POST | `/api/rag/query` | RAG-based document retrieval (pgvector) |
| POST | `/api/gap-analysis` | Async skill gap analysis |

## Admin

| Method | Path | Notes |
|---|---|---|
| POST | `/api/api-keys/` | Create API key |
| GET | `/api/api-keys/` | List API keys |
| DELETE | `/api/api-keys/{id}` | Revoke API key |
| GET | `/api/audit-logs/` | Audit log entries |

## Export / Misc

| Method | Path | Notes |
|---|---|---|
| GET | `/api/export/roadmap/{profile_id}` | PDF export of roadmap |
| GET | `/api/peer-comparison/{profile_id}` | Anonymised peer benchmark |
| GET | `/api/project-suggestions/{profile_id}` | Portfolio project ideas |
| GET | `/health` | Health check (no auth) |

## Chat SSE Parsing

`POST /api/chat` returns `text/event-stream`. axios delivers the whole body as a string:

```typescript
if (typeof res.data === "string") {
  const lines = res.data.split("\n");
  const engineLine = lines.find((l) => l.startsWith("[ENGINE:"));
  const reply = lines.filter((l) => !l.startsWith("[ENGINE:")).join("\n").trim();
}
```

## Error Format

All errors return:
```json
{ "detail": "Human-readable message" }
```

Rate-limit errors (429):
```json
{ "detail": "Too many requests. Please try again later." }
```
