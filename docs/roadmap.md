# SkillBridge — Production Roadmap & Feature Implementation Plan

---

## 1. Overview

**Goal:** Evolve SkillBridge from a functional MVP (RAG pipeline, resume parsing, job recommendations, LLM orchestration) into a production-ready, enterprise-grade career intelligence platform that is secure, observable, scalable, and commercially viable.

**Scope:** 9 categories × ~35 features across 12 two-week sprints (~6 months). Each feature is broken down into tasks, risks, tests, and deployment steps. The plan is designed to be copy-pasted into GitHub Projects or Confluence and converted into epics/issues.

**Principles:**
- Security and hardening ship *first* — nothing else goes to production without them.
- Each sprint produces deployable, independently releasable increments.
- Infrastructure changes (Terraform) are paired with the application changes that require them.
- Rollbacks are always possible within the same sprint via feature flags or Terraform `destroy -target`.

---

## 2. Prioritisation Matrix

> Scoring: User Value × Implementation Effort → Priority tier.
> U = User Value (H/M/L), E = Effort (H/M/L), P = Priority (P0–P3).

| # | Feature | Category | U | E | Priority | Rationale |
|---|---------|----------|---|---|----------|-----------|
| 1 | CSRF Protection | Security | H | L | **P0** | Blocking issue; ships in Sprint 1 |
| 2 | Global Rate Limiter | Security | H | L | **P0** | DoS vector; ships in Sprint 1 |
| 3 | Request-size Limits | Security | H | L | **P0** | OOM/Lambda cost risk; Sprint 1 |
| 4 | Remove Hard-coded Secrets | Security | H | L | **P0** | Compliance blocker; Sprint 1 |
| 5 | Audit Logging (JSON) | Compliance | H | M | **P0** | Already partially in place via LogBus; complete in Sprint 1 |
| 6 | Skill-Gap Dashboard | Core Product | H | M | **P1** | Core differentiator; Sprint 2 |
| 7 | Career Roadmap | Core Product | H | M | **P1** | High engagement driver; Sprint 2 |
| 8 | Interview-Prep Bot | Core Product | H | M | **P1** | Differentiation; Sprint 3 |
| 9 | Job Alerts (real-time) | Core Product | H | M | **P1** | Retention; Sprint 3 |
| 10 | Learning Progress Tracker | Analytics | H | M | **P1** | Measurable user growth; Sprint 4 |
| 11 | Dark Mode / Theme | UX | H | L | **P1** | Table stakes for modern SaaS; Sprint 4 |
| 12 | Mobile-first PWA | UX | H | M | **P1** | SEA mobile-first market; Sprint 4–5 |
| 13 | LinkedIn Profile Import | Core Product | H | H | **P1** | Reduces onboarding friction; Sprint 5 |
| 14 | GDPR/PDPA Consent Flow | Compliance | H | M | **P1** | Legal requirement (Singapore); Sprint 5 |
| 15 | Secrets Rotation (KMS/SSM) | Compliance | H | M | **P1** | SOC-2 prereq; Sprint 5 |
| 16 | Dynamic Salary Estimator | Analytics | H | M | **P2** | High perceived value; Sprint 6 |
| 17 | Knowledge Graph | Analytics | M | H | **P2** | Strategic differentiator; Sprint 6–7 |
| 18 | Micro-learning Library | Learning | M | M | **P2** | Content moat; Sprint 6 |
| 19 | Portfolio Builder | Learning | M | M | **P2** | Engagement; Sprint 7 |
| 20 | Redis Cache Layer | Infra | H | M | **P2** | Latency + cost; Sprint 7 |
| 21 | SQS/SNS Event Queue | Infra | M | M | **P2** | Decoupling; Sprint 7 |
| 22 | OpenTelemetry Tracing | Observability | M | M | **P2** | Operational visibility; Sprint 7 |
| 23 | Accessibility (WCAG 2.2) | UX | H | M | **P2** | Inclusive design + legal; Sprint 8 |
| 24 | Internationalisation (i18n) | UX | M | M | **P2** | Regional expansion; Sprint 8 |
| 25 | Premium Subscription (Stripe) | Monetisation | H | M | **P2** | Revenue; Sprint 8 |
| 26 | Prompt-cost Optimiser | AI | M | M | **P2** | Cost control at scale; Sprint 8 |
| 27 | Multimodal Retrieval | AI | M | H | **P3** | Future differentiation; Sprint 9 |
| 28 | Fine-tuned Domain LLM | AI | M | H | **P3** | Accuracy gain; Sprint 9–10 |
| 29 | Corporate Portal | Monetisation | H | H | **P3** | B2B revenue; Sprint 10 |
| 30 | Job Board Integrations | Monetisation | M | M | **P3** | Distribution; Sprint 10 |
| 31 | Open API (partner tier) | Monetisation | M | M | **P3** | Ecosystem; Sprint 11 |
| 32 | Micro-service Refactor | Infra | L | H | **P3** | Post-product-fit; Sprint 11 |
| 33 | Canary / Blue-Green Deploy | Infra | M | M | **P3** | Operational resilience; Sprint 11 |
| 34 | Penetration Testing Pipeline | Compliance | H | M | **P3** | SOC-2; Sprint 12 |
| 35 | SOC-2 / ISO 27001 Readiness | Compliance | M | H | **P3** | Enterprise sales; Sprint 12 |

---

## 3. Sprint Roadmap

| Sprint | Dates (indicative) | Theme | Milestone |
|--------|-------------------|-------|-----------|
| **S1** | Wk 1–2 | Security Hardening | Passes OWASP Top-10 baseline scan |
| **S2** | Wk 3–4 | Core Product I | Skill-Gap Dashboard + Career Roadmap live |
| **S3** | Wk 5–6 | Core Product II | Interview Prep Bot + Job Alerts |
| **S4** | Wk 7–8 | Progress & UX I | Progress Tracker + Dark Mode |
| **S5** | Wk 9–10 | Onboarding & Compliance | LinkedIn Import + GDPR/PDPA + Secrets Rotation |
| **S6** | Wk 11–12 | Analytics I | Salary Estimator + Micro-learning Library |
| **S7** | Wk 13–14 | Analytics II + Infra I | Knowledge Graph + Redis + SQS/SNS + OTel |
| **S8** | Wk 15–16 | UX II + Monetisation I | WCAG + i18n + Stripe Subscriptions + Prompt Optimiser |
| **S9** | Wk 17–18 | AI Enhancements | Multimodal RAG + Fine-tune Pipeline |
| **S10** | Wk 19–20 | Monetisation II | Corporate Portal + Job Board Integrations |
| **S11** | Wk 21–22 | Infra II + Open API | Canary Deploy + Partner API + Micro-service Spike |
| **S12** | Wk 23–24 | Compliance & Launch | Pen-test + SOC-2 readiness + Go-live |

---

## 4. Feature Breakdown

---

### Sprint 1 — Security Hardening

---

#### 4.1 CSRF Protection

**Description:** Stateless JWT-based APIs don't require traditional CSRF tokens when using `Authorization: Bearer` headers. However, the auth cookie (if introduced) and any form POST endpoints require `SameSite=Strict` cookies and double-submit cookie pattern.

**Tasks:**
- Audit all mutating endpoints — confirm none accept cookies for auth (currently JWT-only via `Authorization` header) ✓
- Enforce `SameSite=Strict; Secure; HttpOnly` on any future session cookies in `main.ts`
- Add `helmet()` middleware with CSP headers in `main.ts`
- Add `@nestjs/throttler` rate limiter (see 4.2) which also mitigates CSRF amplification
- Document the JWT-in-header approach as the canonical auth pattern in `docs/security.md`

```typescript
// nestjs-backend/src/main.ts
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // tighten after audit
      connectSrc: ["'self'", process.env.CORS_ALLOWED_ORIGINS],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Dependencies:** None.

**Deliverables:**
- PR: `feat(security): add helmet CSP + SameSite cookie policy`
- `docs/security.md` — auth patterns, cookie policy
- Deployment: zero-downtime Lambda redeploy via `skip_terraform=true`

**Risk & Mitigation:**
- CSP `unsafe-inline` needed for Next.js hydration → use nonce-based CSP in S2; accept risk for S1
- Helmet defaults may break font CDN → test against staging before prod

**Testing:**
- Unit: `helmet` config assertions in `main.spec.ts`
- Security: OWASP ZAP passive scan on staging after deploy

---

#### 4.2 Global Rate Limiter

**Description:** Apply `@nestjs/throttler` globally: 60 req/min per IP for standard endpoints; 10 req/min for auth and LLM-heavy endpoints.

**Tasks:**
- `npm install @nestjs/throttler` in `nestjs-backend/`
- Register `ThrottlerModule` in `AppModule` with `ttl: 60, limit: 60`
- Create `ThrottlerBehindProxyGuard` to read `X-Forwarded-For` correctly from API Gateway
- Apply `@Throttle(10, 60)` decorator on `/auth/login`, `/auth/register`, `/api/chat`, `/api/recommend`, `/api/rag/query`
- Configure throttler storage: in-memory for Lambda (acceptable; per-instance), Redis (Sprint 7) for cross-instance accuracy

```typescript
// app.module.ts
ThrottlerModule.forRoot([{
  name: 'default',
  ttl: 60_000,
  limit: 60,
}]),
// main.ts
app.useGlobalGuards(new ThrottlerBehindProxyGuard(reflector));
```

**Dependencies:** None (Redis upgrade in Sprint 7).

**Deliverables:**
- PR: `feat(security): global rate limiter with per-endpoint overrides`
- Throttler config documented in `CLAUDE.md` env section
- 429 response format added to `docs/api-reference.md`

**Risk & Mitigation:**
- Lambda cold starts = separate in-memory stores → rate limit is per-instance, not global. Accepted until Sprint 7 Redis layer. Document explicitly.
- API Gateway also has a 10K req/s account limit — keep as backstop

**Testing:**
- Unit: mock `ThrottlerGuard` + assert 429 after limit
- Integration: `autocannon -c 5 -d 10 http://localhost:8000/api/recommend` → assert 429s appear

---

#### 4.3 Request-Size Limits

**Description:** Lambda default payload is 6 MB (sync). NestJS `json()` parser defaults to 100 KB. Enforce: JSON body ≤ 10 KB globally; file uploads ≤ 10 MB; raise explicit 413.

**Tasks:**
- Set `app.use(express.json({ limit: '10kb' }))` in `main.ts` before route registration
- Set `app.use(express.urlencoded({ limit: '10kb', extended: true }))`
- Override on `/api/upload-resume`: use `multer` with `limits: { fileSize: 10 * 1024 * 1024 }` (already uses multer — verify config)
- Add API Gateway binary media type config in Terraform (`terraform/modules/api_gateway/`) to accept `multipart/form-data` up to 10 MB
- Return `413 Payload Too Large` with structured JSON error body

**Dependencies:** None.

**Deliverables:**
- PR: `feat(security): enforce JSON 10KB + file 10MB request size limits`
- Terraform: `aws_api_gateway_rest_api` `minimum_compression_size` + binary media types

**Risk & Mitigation:**
- API Gateway hard limit is 10 MB total — fine for 10 MB file uploads
- If future bulk import feature needs larger payloads → use S3 presigned upload pattern (already documented in CLAUDE.md)

**Testing:**
- Integration: `curl -X POST -d "$(python3 -c "print('x'*20000)")" .../api/recommend` → expect 413
- File: upload 11 MB file to `/api/upload-resume` → expect 413

---

#### 4.4 Remove Hard-coded Secrets

**Description:** Audit repo for any secrets committed to git; migrate all to AWS Secrets Manager / SSM Parameter Store; update CI to inject via environment.

**Tasks:**
- Run `git log --all -p | grep -E "(API_KEY|SECRET|PASSWORD|TOKEN)" | grep -v "CHANGE_ME"` — triage findings
- Run `truffleHog3 --regex --entropy --json .` in CI as a pre-commit check
- Move all secrets from `.env.example` to SSM Parameter Store (secure string) or Secrets Manager
- Update `terraform/modules/backend/lambda.tf` to inject Secrets Manager ARNs as env vars
- Update GitHub Actions to retrieve secrets from AWS Secrets Manager (using OIDC, not static keys where possible)
- Rotate any exposed secrets immediately; invalidate old keys
- Add `.gitleaks.toml` config + `gitleaks detect` as pre-commit hook and CI job

```yaml
# .github/workflows/secret-scan.yml
- name: Gitleaks
  uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Dependencies:** Existing Secrets Manager setup (partially in place per CLAUDE.md).

**Deliverables:**
- PR: `chore(security): remove hardcoded secrets, add gitleaks CI gate`
- `docs/secrets-management.md` — rotation runbook
- All secrets in Secrets Manager with `/skillbridge/{env}/{key}` naming convention

**Risk & Mitigation:**
- Lambda cold start latency from Secrets Manager SDK call → cache in module scope (already done for `INTERNAL_AUTOMATION_TOKEN`); extend pattern to all secrets
- If GROQ_API_KEY is already in CI secrets → audit access log and rotate preemptively

**Testing:**
- CI: `gitleaks detect` passes with zero findings
- Deployment: Lambda boots with env injected from Secrets Manager (smoke test `GET /internal/health`)

---

#### 4.5 Audit Logging (Complete)

**Description:** The `LogBus` / `SystemLog` infrastructure exists. Complete it: ensure every auth event, data mutation, and LLM call emits a structured JSON audit entry with `userId`, `tenantId`, `action`, `resource`, `outcome`, `ip`, `requestId`, `durationMs`.

**Tasks:**
- Define `AuditEntry` interface in `common/audit/audit.types.ts`
- Create `AuditService` wrapping `LogBusService` — adds `requestId` from `AsyncLocalStorage`
- Add `AuditInterceptor` (global) — captures request metadata, calls `AuditService.log()` on response
- Persist `AuditEntry` to `SystemLog` entity (already exists) with `category: 'audit'`
- Add `GET /api/logs/audit?from=&to=&userId=` endpoint (admin-only, JWT + role guard)
- CloudWatch log group `/skillbridge/{env}/audit` — forward `category=audit` entries via Lambda log subscription

**Dependencies:** Existing `LogBusService`, `SystemLog` entity, `LogController`.

**Deliverables:**
- PR: `feat(audit): complete structured audit logging with AuditInterceptor`
- Schema: `SystemLog` gains `category`, `request_id`, `ip` columns (additive migration — safe on cold start)

**Risk & Mitigation:**
- Logging every request adds ~5 ms latency → sample at 100% for auth/mutation, 10% for reads
- PII in logs (email, resume text) → hash `userId` in audit log; never log request/response body

**Testing:**
- Unit: `AuditInterceptor` emits correct shape
- Integration: `POST /auth/login` → `GET /api/logs/recent` shows audit entry with `action: "auth.login"`

---

### Sprint 2 — Core Product I

---

#### 4.6 Skill-Gap Dashboard

**Description:** A full-page dashboard (replacing the current partial implementation) showing: current skills vs. target role requirements, gap severity heatmap, recommended actions, and trend over time.

**Tasks:**

**Backend:**
- Enhance `GET /api/skill-gap/:id` response: add `trendData` (last 6 skill-progress snapshots), `recommendedCourses` (top 3 from `/api/ssg/courses`), `estimatedTimeToClose` (weeks, heuristic)
- Create `ProfileSnapshotService` — persists a `ProfileSnapshot` every time skill-gap is computed (entity already exists)
- Add `GET /api/skill-gap/:id/history` returning the last 12 snapshots for chart rendering

**Frontend:**
- New page `app/skill-gap/page.tsx` (already exists — enhance with Stitch design system)
- Components:
  - `SkillHeatmap` — 2D grid: skills × proficiency, color-coded by gap severity
  - `GapTimeline` — Recharts AreaChart of overall gap score over time
  - `ActionCard` — per-gap recommended action (course link, estimated weeks)
- Wire `GET /api/skill-gap/:id/history` via TanStack Query with 5-min stale time

**Dependencies:** `ProfileSnapshot` entity (exists), `SsgModule` (exists), `skill-progress` entity (exists).

**Deliverables:**
- PRs: `feat(skill-gap): history endpoint + snapshot persistence` | `feat(frontend): skill-gap dashboard rewrite`
- Migration: `profile_snapshots` gains `gap_score` float column (additive)
- Docs: `docs/api-reference.md` updated with new response shape

**Risk & Mitigation:**
- Snapshot on every query = write amplification → debounce: only snapshot if last snapshot > 24h old
- History endpoint with 12 snapshots × all skills = large payload → paginate or aggregate server-side to `{ date, overallGapScore }[]`

**Testing:**
- Unit: `ProfileSnapshotService.maybeSnapshot()` debounce logic
- Integration: `GET /api/skill-gap/:id` → `GET /api/skill-gap/:id/history` → verify snapshot created
- E2E (Playwright): navigate to `/skill-gap`, verify heatmap renders and timeline shows data

---

#### 4.7 Career Roadmap

**Description:** A visual, multi-phase roadmap from current role → target role, with milestones, courses, and time estimates per phase. Currently `/api/upskilling/:id` returns a raw roadmap JSON — this feature gives it a proper UI and richer data.

**Tasks:**

**Backend:**
- Enhance `GET /api/upskilling/:id` response: add `phases[].milestones[]`, `phases[].courses[]` (SSG-linked), `phases[].durationWeeks`
- Add `POST /api/roadmap/bookmark` — save a roadmap phase item to user profile
- Add `GET /api/roadmap/:userId` — return bookmarked items with completion status

**Frontend:**
- `app/roadmap/page.tsx` — PhaseTimeline (already exists as component) + CourseCards per phase
- `RoadmapPhaseCard` — expandable card: phase name, skills to gain, courses, duration, bookmark button
- `RoadmapProgressBar` — overall completion % across bookmarked items
- Sticky sidebar: current role → target role path visualisation (SVG arrow chain)

**Dependencies:** `SsgModule`, `ProfileSnapshotService`, `skill-progress` entity.

**Deliverables:**
- PRs: `feat(roadmap): phased roadmap with milestones + bookmark API` | `feat(frontend): career roadmap page`
- DB: new `roadmap_bookmark` table (userId, phase, courseRef, completedAt nullable) — added via `updateSchema()`

**Risk & Mitigation:**
- LLM-generated roadmap phases may be inconsistent → cache per `(profileId, targetRoleId)` with 24h TTL in-memory (extend existing recommendation cache pattern)
- Course references from SSG may go stale → store courseRef + snapshotted title; show "course may have changed" warning if ref 404s

**Testing:**
- Unit: roadmap phase duration heuristic (skills × 2 weeks each, capped at 26 weeks)
- Integration: `GET /api/upskilling/:id` → phases have `courses[]` with valid `ssgRef`
- Frontend: Playwright — bookmark a phase, reload, verify bookmark persists

---

### Sprint 3 — Core Product II

---

#### 4.8 Interview-Prep Bot

**Description:** An AI-powered interview simulator: user selects a target role, receives realistic behavioral + technical questions, submits answers, gets LLM-scored feedback with improvement suggestions. The `POST /api/interview` endpoint already exists — this sprint builds the full conversational UI.

**Tasks:**

**Backend:**
- Extend `IntelligenceController.interview()`: add `sessionId` (UUID v4), `round` (int), store Q&A turns in `interview_session` table
- Add `GET /api/interview/sessions/:userId` — list past sessions with scores
- Add `GET /api/interview/session/:sessionId` — full Q&A transcript
- Scoring rubric: use LLM prompt with STAR method checklist → return `{ score: 0-10, feedback: string, improvements: string[] }`

**Frontend:**
- `app/interview/page.tsx` — two-panel layout: left = question + timer, right = answer textarea + submit
- `InterviewRoundCard` — shows question, role context, expected answer framework (STAR)
- `FeedbackPanel` — score gauge (0-10), LLM feedback text, improvement bullets
- `SessionHistoryDrawer` — past sessions with scores, accessible from sidebar

**Dependencies:** `LlmService` (exists), `IntelligenceModule` (exists).

**Deliverables:**
- PRs: `feat(interview): session persistence + scoring rubric` | `feat(frontend): interview prep UI`
- DB: `interview_session` table, `interview_turn` table (sessionId FK, question, answer, score, feedback)

**Risk & Mitigation:**
- LLM scoring latency (2–5s) → stream feedback token by token using SSE on `/api/interview/stream`; show spinner
- Low-quality answers → add minimum word count validation (50 words) before sending to LLM

**Testing:**
- Unit: scoring rubric prompt template — mock LLM returns score JSON → verify parse
- Integration: full round trip: POST question → POST answer → GET session transcript
- Load: 10 concurrent interview sessions → p95 LLM latency < 8s

---

#### 4.9 Job Alerts (Real-time Feed)

**Description:** Users subscribe to job alert criteria (role, salary range, skills required). When new jobs matching criteria are ingested (via SSG sync or n8n), users receive in-app notifications and optional email digests.

**Tasks:**

**Backend:**
- `job-alerts` module: `JobAlert` entity (userId, roleIds[], salaryMin, salaryMax, skills[], frequency: realtime|daily|weekly)
- `POST /api/job-alerts` — create alert; `GET /api/job-alerts/:userId`; `DELETE /api/job-alerts/:id`
- `JobAlertMatcherService` — triggered by `market_insights` Lambda or n8n `analysis_notification` workflow; computes matches using existing recommendation scoring
- `NotificationService` — publishes to SNS topic `skillbridge-{env}-notifications`; SNS → SES for email digest
- `GET /api/notifications` — paginated in-app notifications feed; `POST /api/notifications/:id/read`

**Frontend:**
- `app/alerts/page.tsx` — alert management: create/edit/delete criteria
- `NotificationBell` in `AppShell` header — badge count, dropdown last 5 notifications
- `AlertCriteriaForm` — multi-select role, salary slider, skill tags

**Dependencies:** SNS topic (add Terraform in S3), SES identity verified, `EventBridge` (existing), n8n `analysis_notification.json` workflow.

**Deliverables:**
- PRs: `feat(alerts): job alert CRUD + matcher service` | `feat(alerts): notification feed + SNS/SES integration` | `feat(frontend): job alerts page + notification bell`
- Terraform: `aws_sns_topic`, `aws_ses_email_identity`, `aws_sqs_queue` for DLQ

**Risk & Mitigation:**
- SES sandbox → production approval required (submit AWS request early in sprint)
- Alert fan-out at scale → use SQS FIFO queue between matcher and notification sender to prevent thundering herd
- PDPA compliance: email notifications require explicit opt-in (handled in Sprint 5 consent flow)

**Testing:**
- Unit: `JobAlertMatcherService.match()` — fixture of 5 jobs + 3 alert criteria → correct matches
- Integration: create alert → trigger mock n8n event → assert SNS publish called
- E2E: create alert in UI → manually trigger matcher → verify notification bell badge increments

---

### Sprint 4 — Progress & UX I

---

#### 4.10 Learning Progress Tracker

**Description:** Extend the existing `skill-progress` and `progress` endpoints into a full progress tracking UI: course completion, skill level advancement, streak tracking, and achievement badges.

**Tasks:**

**Backend:**
- Add `completedAt` to `SkillProgress` entity; add `streakDays` computed property
- Add `CourseEnrollment` entity (userId, courseRef, enrolledAt, completedAt, progressPct)
- `POST /api/courses/:ref/enroll` / `PATCH /api/courses/:ref/progress` endpoints
- `AchievementService` — rule-based badges: "First Course Completed", "7-day streak", "10 Skills Unlocked" → stored in `achievement` table
- Add `GET /api/progress/:id/achievements`

**Frontend:**
- `app/progress/page.tsx` (already exists — enhance)
- `StreakWidget` — GitHub-style contribution heatmap (Recharts) showing daily learning activity
- `AchievementShelf` — badge grid with locked/unlocked states
- `CourseProgressList` — enrolled courses with progress bars
- `MilestoneTimeline` — vertical timeline of completed milestones

**Dependencies:** `skill-progress` entity (exists), `courses` module (exists), SSG integration (exists).

**Deliverables:**
- PRs: `feat(progress): course enrollment + achievements + streak tracking` | `feat(frontend): enhanced progress tracker`

**Risk & Mitigation:**
- Achievement rule engine complexity → start with 5 hard-coded rules; generalise in Sprint 8
- Streak calculation timezone-aware (Singapore SGT = UTC+8) → store all timestamps in UTC, compute streak in SGT on read

**Testing:**
- Unit: `AchievementService.evaluate()` — 10 fixture scenarios
- Integration: enroll course → update progress to 100 → verify `completedAt` set + achievement granted

---

#### 4.11 Dark Mode / Theme Switcher

**Description:** Add system-aware + manual dark/light theme switching using CSS custom properties (already OKLCH-based) and shadcn/ui's `ThemeProvider`.

**Tasks:**
- Install `next-themes` in `frontend/`
- Wrap `layout.tsx` with `<ThemeProvider attribute="class" defaultTheme="system">`
- Define dark-mode overrides in `globals.css` under `.dark {}` — OKLCH dark palette maintaining "Clean Tech Intelligence" identity:
  - `--background`: `oklch(0.14 0.02 263)` (deep indigo-tinted near-black)
  - `--card`: `oklch(0.18 0.02 263)`
  - `--primary`: same indigo (works on both)
  - Update `--sidebar-bg`, `--glass-card` vars for dark context
- Add `ThemeToggle` button in `AppShell` header (sun/moon icon, `Button` variant `ghost`)
- Persist preference in `localStorage` (handled by `next-themes`)
- Audit all pages for hardcoded `bg-white`, `text-black`, `border-gray-*` → replace with semantic tokens

**Dependencies:** None. Pure frontend change.

**Deliverables:**
- PR: `feat(ux): dark mode with next-themes + OKLCH dark palette`
- Visual regression: Playwright screenshots in both themes on `/dashboard`, `/recommendations`, `/skill-gap`

**Risk & Mitigation:**
- Three.js canvases (landing, architecture) → dark mode requires adjusting `ambientLight` colour; use `useTheme()` hook to pass theme to canvas
- Recharts charts — hardcoded `hsl()` stroke colours → OK per MEMORY.md, these are semantic status colours not theme-dependent

**Testing:**
- Visual: Playwright `page.emulateMedia({ colorScheme: 'dark' })` + screenshot diff
- Accessibility: colour contrast ratio ≥ 4.5:1 in dark mode (use `axe-core`)

---

#### 4.12 Mobile-first PWA

**Description:** Make SkillBridge installable and offline-capable on mobile (primarily Android in Singapore market).

**Tasks:**
- Add `manifest.json` to `frontend/public/`: name, icons (192/512px), `theme_color: "#6366f1"`, `display: "standalone"`
- Configure `next-pwa` (or `@ducanh2912/next-pwa`): service worker with network-first strategy for API calls, cache-first for static assets
- Responsive audit: fix viewport issues on screens < 375px (sidebar collapse, modal overflow, table scroll)
- Bottom navigation bar for mobile (`app/layout.tsx` — detect `useMediaQuery('(max-width: 768px)')` → render `MobileNav` instead of sidebar)
- Offline page: `app/offline/page.tsx` — "You're offline. Your cached data is still available."
- Push notification permission prompt (for Job Alerts — Sprint 3): use Web Push API + VAPID keys

**Dependencies:** Sprint 3 (Job Alerts for push notifications). PWA shell ships independently.

**Deliverables:**
- PR: `feat(pwa): manifest + service worker + mobile nav + offline page`
- Lighthouse PWA score ≥ 90

**Risk & Mitigation:**
- Next.js static export + service worker → must test with `npm run build && npx serve out/` locally
- iOS Safari PWA limitations: no push notifications → degrade gracefully to in-app bell only on iOS

**Testing:**
- Lighthouse CI job: `lhci autorun --collect.url=...` → assert PWA score ≥ 90
- Manual: Chrome DevTools Application → "Add to Home Screen" on Android emulator

---

### Sprint 5 — Onboarding & Compliance

---

#### 4.13 LinkedIn Profile Import

**Description:** Allow users to import their LinkedIn profile via OAuth 2.0 (LinkedIn API v2) to pre-populate resume fields, skills, and experience without manual entry.

**Tasks:**

**Backend:**
- Register LinkedIn OAuth app (LinkedIn Developer Portal) — obtain `CLIENT_ID` / `CLIENT_SECRET`
- Add `linkedin` Passport.js strategy (`passport-linkedin-oauth2`) in `auth/` module
- `GET /api/auth/linkedin` — redirect to LinkedIn OAuth
- `GET /api/auth/linkedin/callback` — exchange code, fetch `/v2/me` + `/v2/emailAddress` + Skills API
- `LinkedInImportService` — maps LinkedIn profile fields to `UserProfile` + `Skill` entities; calls `EmbeddingService` on new skills
- `POST /api/profile/import/linkedin` — for already-logged-in users to link and import

**Frontend:**
- `app/onboarding/page.tsx` — step 0: "Import from LinkedIn" CTA (primary) vs "Upload Resume" vs "Manual entry"
- `LinkedInImportButton` — OAuth redirect button with LinkedIn branding guidelines
- `ImportPreviewModal` — show imported fields with edit-in-place before saving

**Dependencies:** LinkedIn Developer account (apply early — approval takes 1–3 days for r_basicprofile). `EmbeddingService` (exists).

**Deliverables:**
- PRs: `feat(auth): LinkedIn OAuth strategy + profile import` | `feat(frontend): LinkedIn import onboarding step`
- Env vars: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_CALLBACK_URL` → Secrets Manager

**Risk & Mitigation:**
- LinkedIn API rate limit: 500 calls/day for free tier → cache imported profile in `UserProfile.linkedinRaw` JSONB field; re-import only on explicit user action
- LinkedIn Skills API deprecated (v2 has limited skills) → fall back to parsing `headline` + `positions[].description` through NLP pipeline
- User refuses OAuth → gracefully fall back to resume upload; never block onboarding

**Testing:**
- Unit: `LinkedInImportService.mapProfile()` — fixture LinkedIn API response → expected `UserProfile` shape
- Integration: mock LinkedIn OAuth server → full OAuth flow → verify profile imported
- E2E: Playwright OAuth flow with mock server (use `msw` or `nock`)

---

#### 4.14 GDPR / PDPA Consent Flow

**Description:** Singapore's PDPA requires explicit consent for data collection and processing. Implement consent recording at registration and a "My Data" control panel.

**Tasks:**

**Backend:**
- `ConsentRecord` entity: userId, consentType (marketing|analytics|dataProcessing|thirdPartySharing), granted (bool), grantedAt, revokedAt, ipAddress, version
- `POST /api/consent` — record consent decisions; `GET /api/consent/:userId`
- `DELETE /api/users/:id/data` — GDPR right-to-erasure: anonymise `User`, `UserProfile`, `SkillProgress`, `ProfileSnapshot`; delete `InterviewSession`, `JobAlert` (hard delete); keep anonymised audit log rows
- `GET /api/users/:id/data-export` — generate JSON export of all user data (GDPR Article 20)
- Consent version tracking: bump version string when privacy policy changes → re-prompt users with old version

**Frontend:**
- `ConsentModal` — shown at registration, listing each consent type with toggle. Required consents (data processing) are mandatory; optional consents (marketing, analytics) default off
- `app/account/privacy/page.tsx` — "My Data" panel: current consent status, revoke buttons, "Download My Data", "Delete My Account"
- Cookie consent banner (for analytics cookies — Sprint 8)

**Dependencies:** Existing `User` entity, `AuditService` (Sprint 1).

**Deliverables:**
- PRs: `feat(compliance): PDPA consent flow + right-to-erasure + data export` | `feat(frontend): privacy control panel`
- `docs/privacy-policy.md` + `docs/pdpa-compliance.md`
- Consent version: `v1.0` (tag in git)

**Risk & Mitigation:**
- Erasure of `UserProfile` cascades to `SkillProgress` — use soft delete (`deletedAt`) with async cleanup job to avoid orphan FK errors
- Data export may be slow for users with many sessions → generate async, store in S3, email signed URL

**Testing:**
- Unit: `UserService.anonymise()` — verify PII fields nulled, audit rows preserved
- Integration: register → grant consents → revoke analytics → verify `ConsentRecord` updated
- Legal review: pass exported JSON to DPO for PDPA checklist sign-off

---

#### 4.15 Secrets Rotation (KMS/SSM)

**Description:** Automate secret rotation for database credentials, JWT secret, and API keys using AWS Secrets Manager rotation Lambdas.

**Tasks:**
- Enable automatic rotation on `skillbridge/{env}/db-password` secret (rotation Lambda: `aws-samples/aws-secretsmanager-rotation-lambdas` — PostgreSQL template)
- Enable rotation on `skillbridge/{env}/jwt-secret` (30-day rotation; custom Lambda updates Aurora user password + NestJS picks up new value on next cold start)
- KMS Customer Managed Key (CMK) for encrypting all Secrets Manager secrets: `aws_kms_key` Terraform resource
- SSM Parameter Store for non-secret config (model names, TTLs) — `SecureString` type with CMK
- Update `env.validation.ts` to support hot-reload of rotated secrets (Lambda lifecycle: re-read Secrets Manager on each invocation rather than at module init)
- CI: `GITHUB_OIDC` role instead of static `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`

**Dependencies:** Existing Secrets Manager setup, Terraform IAM modules.

**Deliverables:**
- PRs: `feat(infra): KMS CMK + Secrets Manager rotation Lambdas` | `feat(ci): GitHub OIDC for AWS auth`
- Terraform: `aws_kms_key`, `aws_secretsmanager_rotation_schedule`, `aws_iam_openid_connect_provider`
- Runbook: `docs/secrets-rotation.md`

**Risk & Mitigation:**
- JWT secret rotation invalidates all live tokens → use dual-key strategy: accept tokens signed by current OR previous secret during 1h overlap window
- DB password rotation while Lambda instances are warm → MikroORM connection pool reconnects on next query after Aurora drops old connection; test with `ECONNRESET` handling

**Testing:**
- Terraform plan: validate rotation schedule resources
- Canary: trigger manual rotation in staging → verify Lambda restarts accept new JWT, old JWT rejected after 1h

---

### Sprint 6 — Analytics I

---

#### 4.16 Dynamic Salary Estimator

**Description:** Given a user's skills, years of experience, and target role, return a salary estimate with percentiles (P25/P50/P75) for Singapore, sourced from seeded `job_roles` data + SSG SkillsFramework + optional external enrichment.

**Tasks:**

**Backend:**
- `SalaryEstimatorService` in `domain/` module (alongside existing market insights)
- Inputs: `roleId`, `yearsExperience`, `skills[]`, `location: "SG"`
- Algorithm:
  1. Base salary from `job_roles.salaryBenchmark` (already seeded)
  2. Skill premium: for each matched skill above `requiredLevel`, add +S$500/skill/yr heuristic
  3. Experience multiplier: `base × (1 + 0.05 × min(yearsExperience, 10))`
  4. Return `{ p25, p50, p75, currency: "SGD", source: "SSG SkillsFramework + SkillBridge model", disclaimer }`
- `POST /api/salary-estimate` (unauthenticated OK)
- `GET /api/salary-estimate/benchmarks` — salary ranges for all roles (for dashboard chart)

**Frontend:**
- `app/market/page.tsx` — add `SalaryEstimatorWidget` alongside existing market insights
- Inputs: role selector, years slider (0–20), skill multi-select (pre-filled from profile if logged in)
- Output: three-bar Recharts chart (P25/P50/P75) + "vs. your current estimated salary" comparison line
- `SalaryInsightCard` in `app/recommendations/page.tsx` — show estimated salary for each recommended role

**Dependencies:** `job_roles` seed data (exists), `SsgModule` (exists), `MarketInsightsModule` (exists).

**Deliverables:**
- PRs: `feat(analytics): dynamic salary estimator + benchmark API` | `feat(frontend): salary estimator widget`

**Risk & Mitigation:**
- Salary data staleness → add `lastUpdated` timestamp to response; note data source is SSG SkillsFramework (updated quarterly)
- Legal disclaimer: salary estimates are indicative — add `disclaimer` field to API response + UI tooltip

**Testing:**
- Unit: `SalaryEstimatorService.estimate()` — 10 role/experience combinations, verify P25 < P50 < P75
- Snapshot test: benchmark response shape locked (OpenAPI contract)

---

#### 4.17 Micro-learning Library

**Description:** A curated content library of short articles, videos, and quizzes tied to skills and gap items. Initial content sourced from SSG SkillsFuture content + curated YouTube embeds.

**Tasks:**

**Backend:**
- `LearningContent` entity: id, title, type (video|article|quiz), durationMinutes, skillIds[], url, provider, difficulty, tags, thumbnailUrl
- Seed with ~50 items covering top 20 skills in `skills_taxonomy.json`
- `GET /api/learning-content?skills[]=&type=&difficulty=&limit=` — filtered listing
- `GET /api/learning-content/recommended/:profileId` — top 10 items based on profile's skill gaps
- `POST /api/learning-content/:id/complete` — marks complete, triggers `AchievementService.evaluate()`

**Frontend:**
- `app/learn/page.tsx` — filter sidebar + content grid (card with thumbnail, duration chip, skill tags)
- `ContentCard` — 16:9 thumbnail, title, provider badge, duration, difficulty badge, "Mark Complete" checkbox
- `VideoModal` — embedded YouTube/Vimeo player with `allow="fullscreen"` (CSP update required)
- Filter bar: type (All/Video/Article/Quiz), difficulty, skill tags (from profile gaps)

**Dependencies:** `EmbeddingService` (for semantic content search in S7), `SkillProgress` (for completion tracking), Sprint 4 Achievement system.

**Deliverables:**
- PRs: `feat(learning): micro-learning content library + recommended endpoint` | `feat(frontend): learn page`
- Seed file: `data/seed/learning_content.json` (~50 items)
- CSP update: add YouTube/Vimeo to `connectSrc` and `frameSrc`

**Risk & Mitigation:**
- External video URLs may go dead → store `url` + `verifiedAt`; weekly cron job pings URLs and flags stale ones
- Copyright: only embed public YouTube/Vimeo links; do not host video files

**Testing:**
- Unit: `recommended` endpoint — profile with 5 gaps → returns 10 content items covering those gaps
- Integration: mark content complete → achievement evaluated
- Visual: Playwright — filter by "Video" + "Beginner" → grid updates correctly

---

### Sprint 7 — Analytics II + Infra I

---

#### 4.18 Knowledge Graph

**Description:** Model the relationships between `JobRole ↔ Skill ↔ Course ↔ LearningContent` as a graph to enable "paths" queries (e.g., "which skills are prerequisite for Data Engineer?").

**Tasks:**

**Backend — PostgreSQL Adjacency (no Neo4j required):**
- `SkillRelation` entity: `fromSkillId`, `toSkillId`, `relationType` (prerequisite|related|replaces), `weight` float
- `RoleSkillRequirement` already implicit in recommendation scoring — materialise as `role_skill_requirement` table: `roleId`, `skillId`, `requiredLevel`, `importance` (critical|preferred|nice-to-have)
- `GraphService` in `domain/` — BFS over `role_skill_requirement` + `skill_relation` to compute `getLearningPath(fromRoleId, toRoleId)` returning ordered skill list
- `GET /api/graph/path?from=:roleId&to=:roleId` — learning path between two roles
- `GET /api/graph/skills/:roleId` — skills network for a role (for D3/Recharts graph viz)

**Frontend:**
- `app/compare/page.tsx` — add "Skill Path" tab alongside existing role comparison
- `SkillGraphViz` — D3 force-directed graph (lightweight; load via `dynamic()`, SSR false) showing skill nodes coloured by gap status
- `PathStepList` — ordered list of skill acquisition steps with estimated weeks per step

**Dependencies:** `job_roles` seed data, `skills_taxonomy.json`, Sprint 6 `LearningContent` (to attach courses to path nodes).

**Deliverables:**
- PRs: `feat(graph): knowledge graph tables + path-finding service` | `feat(frontend): skill graph visualisation`
- Seed: `data/seed/skill_relations.json` (~200 prerequisite relations for top 30 skills)

**Risk & Mitigation:**
- Graph cycles (Skill A prereq Skill B prereq Skill A) → BFS with visited-set; test with intentional cycle in seed data
- D3 bundle size (~50 KB) → load only `d3-force`, `d3-selection`, `d3-drag` sub-packages

**Testing:**
- Unit: `GraphService.getLearningPath()` — 5 role pairs → expected path lengths
- Visual: Playwright — navigate to `/compare?from=1&to=5` → graph canvas renders > 0 nodes

---

#### 4.19 Redis Cache Layer

**Description:** Replace in-memory TTL caches (recommendation cache, SSG cache) with Redis (ElastiCache Serverless) for cross-Lambda consistency and lower latency.

**Tasks:**
- Terraform: `aws_elasticache_serverless_cache` (Redis 7 compatible, min 0.5 GB) in private subnets; security group allows Lambda
- `npm install ioredis` in `nestjs-backend/`
- `CacheModule` wrapping `ioredis` client with `get/set/del/ttl` helpers; connection pooled (1 connection per Lambda instance)
- Migrate `RecommendationService` in-memory cache → `CacheModule.set('rec:{profileId}', json, 300)`
- Migrate `SsgModule` PostgreSQL cache → Redis (keep PG as cold fallback)
- Migrate `ThrottlerModule` storage → `ThrottlerStorageRedisService` from `@nest-lab/throttler-storage-redis`
- Env vars: `REDIS_URL` → Secrets Manager

**Dependencies:** Sprint 1 (throttler must already be in place).

**Deliverables:**
- PRs: `feat(infra): Redis ElastiCache + CacheModule` | `feat(cache): migrate recommendation + SSG caches to Redis`
- Terraform: `elasticache.tf` in `terraform/modules/`

**Risk & Mitigation:**
- Lambda → VPC → ElastiCache adds ~1–2ms latency but saves 200–500ms LLM fallback calls → net positive
- Redis connection limit: ElastiCache Serverless scales automatically; no pre-provisioned connections
- Cold start: `ioredis` lazy-connects on first use → add `await redis.ping()` in `onModuleInit()` to fail fast

**Testing:**
- Integration: set cache key → new Lambda instance reads same key (proves cross-instance sharing)
- Performance: benchmark `GET /api/recommend` with cold vs. warm Redis cache

---

#### 4.20 SQS/SNS Event Queue

**Description:** Decouple long-running AI operations (embedding generation, LLM rationale pre-gen, job alert matching) from the synchronous request path using SQS.

**Tasks:**
- Terraform: `aws_sqs_queue` `skillbridge-{env}-jobs` (standard, 30s visibility timeout, DLQ after 3 retries); `aws_sqs_queue` DLQ
- `QueueModule` — wraps AWS SDK SQS client; `enqueue(queueUrl, body, delaySeconds?)`
- Refactor `EmbeddingService.generateAndStore()` — when called from HTTP request, enqueue embedding job instead of blocking
- `embedding-worker.lambda.ts` — polls SQS, calls `EmbeddingService.generateAndStore()` synchronously, deletes message on success
- Wire `JobAlertMatcherService` (Sprint 3) to publish match events to SNS → SQS subscription for notification Lambda
- EventBridge Scheduler triggers existing automation Lambdas via SQS (not direct Lambda Invoke) for retry resilience

**Dependencies:** Sprint 3 (Job Alerts), Sprint 6 (Micro-learning completion events).

**Deliverables:**
- PRs: `feat(infra): SQS event queue + embedding worker Lambda` | `feat(alerts): SNS→SQS notification pipeline`
- Terraform: `sqs.tf`, `sns_subscriptions.tf`

**Risk & Mitigation:**
- Message duplication (SQS at-least-once) → embedding worker is idempotent (upsert on `document_chunk.id`)
- DLQ monitoring → CloudWatch alarm on DLQ depth > 0 → SNS alert to ops email

**Testing:**
- Integration: enqueue embedding job → worker Lambda processes → verify `document_chunk` row created
- Chaos: manually send poison-pill message → verify DLQ receives after 3 retries, no Lambda crash

---

#### 4.21 OpenTelemetry Tracing

**Description:** Instrument NestJS backend with OpenTelemetry SDK; export traces to AWS X-Ray (already partially enabled) and metrics to CloudWatch EMF.

**Tasks:**
- `npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http`
- `src/telemetry.ts` — initialise OTel SDK before NestJS bootstrap (must be `require()`d first in `main.ts`)
- Auto-instrument: HTTP, Express, pg (MikroORM), `ioredis` (Sprint 7), AWS SDK
- Custom spans: wrap `LlmService.dispatch()`, `EmbeddingService.embed()`, `RagService.query()` with named spans + attributes (`llm.provider`, `embedding.model`, `rag.topK`)
- Export to AWS ADOT Collector sidecar (or directly to X-Ray OTLP endpoint)
- CloudWatch dashboard: p50/p95/p99 for `/api/recommend`, `/api/rag/query`, `/api/chat`
- Add `traceId` to all HTTP response headers (`X-Trace-Id`) for client-side correlation

**Dependencies:** Sprint 7 Redis (to instrument Redis calls), existing X-Ray in Lambda.

**Deliverables:**
- PRs: `feat(observability): OpenTelemetry tracing + CloudWatch dashboard`
- Terraform: CloudWatch dashboard JSON; X-Ray sampling rule (5% in prod, 100% in dev)

**Risk & Mitigation:**
- OTel SDK adds ~50ms cold start → use `@opentelemetry/sdk-node` lazy init; profile in staging
- Sensitive data in span attributes → never include request body; only IDs and durations

**Testing:**
- Integration: `GET /api/recommend` → X-Ray console shows trace with child spans for DB + LLM
- Performance: cold start with OTel < cold start without OTel + 100ms

---

### Sprint 8 — UX II + Monetisation I

---

#### 4.22 Accessibility (WCAG 2.2)

**Description:** Audit and remediate the frontend to meet WCAG 2.2 AA standard.

**Tasks:**
- Run `axe-core` via Playwright on all 12 app pages → triage findings by severity
- Critical fixes (must complete Sprint 8):
  - All interactive elements have visible focus indicators (`focus-visible:ring-2 ring-primary`)
  - Form inputs have associated `<label>` elements (not just placeholder text)
  - Images have descriptive `alt` attributes; decorative images have `alt=""`
  - Colour contrast ≥ 4.5:1 for normal text (audit OKLCH palette — check dark/light modes)
  - `role="dialog"` + `aria-modal="true"` + focus trap on all modals (`AppModal.tsx`)
  - Skip-to-content link as first focusable element in `layout.tsx`
  - Tables have `<th scope>` (skill-gap table, progress table)
- Keyboard navigation: all pages fully operable without mouse
- Screen reader test (NVDA/VoiceOver) on dashboard and skill-gap page

**Dependencies:** Sprint 4 Dark Mode (contrast ratios must be verified in both themes).

**Deliverables:**
- PRs: `fix(a11y): WCAG 2.2 AA remediation — focus, contrast, ARIA, forms`
- Axe CI job: `axe-playwright` on critical pages → zero critical/serious violations gate

**Risk & Mitigation:**
- Three.js canvas: inaccessible by nature → add `aria-label="Interactive 3D architecture diagram"` + hidden text description
- Recharts: SVG charts need `aria-label` + `role="img"` + `<title>` elements

**Testing:**
- CI: `axe-playwright` zero-violation gate (critical + serious)
- Manual: keyboard-only navigation of complete job recommendation flow
- Manual: VoiceOver (macOS) on Dashboard and Skill-Gap pages

---

#### 4.23 Internationalisation (i18n)

**Description:** Prepare the platform for Simplified Chinese and Malay (Singapore's other official languages). Ship English + Chinese in Sprint 8; Malay in Sprint 10.

**Tasks:**
- `npm install next-intl` in `frontend/`
- Extract all UI strings to `messages/en.json` (auto-extraction script: `i18n-ally` VS Code extension)
- Translate to `messages/zh.json` (Simplified Chinese; use DeepL API for initial draft, human review)
- Configure `next.config.ts` `i18n: { locales: ['en', 'zh'], defaultLocale: 'en' }`
- Add locale switcher in `AppShell` header: flag icon dropdown
- Backend: `Accept-Language` header parsing → LLM prompts in `LlmService` inject locale-aware instruction: `"Respond in ${locale}"`
- RTL support: not needed for Chinese/Malay (both LTR)

**Dependencies:** Sprint 8 Accessibility (string extraction may surface a11y issues).

**Deliverables:**
- PRs: `feat(i18n): next-intl setup + English + Chinese translations`
- `messages/en.json`, `messages/zh.json` (~400 strings)

**Risk & Mitigation:**
- LLM responses in Chinese → test with Groq llama-3.3-70b-versatile (supports Chinese); fallback to Gemini if quality poor
- String extraction: dynamic strings (e.g., role names from DB) → pass through `useTranslations()` with interpolation; don't translate DB content

**Testing:**
- Visual: Playwright `context.setExtraHTTPHeaders({'Accept-Language': 'zh'})` → page renders Chinese
- String coverage: CI script asserts `messages/zh.json` has same keys as `messages/en.json`

---

#### 4.24 Premium Subscription (Stripe)

**Description:** Freemium model: Free tier (5 recommendations/day, 1 interview session/week) vs. Premium ($9.90/month SGD) with unlimited access + salary estimator + career plan downloads.

**Tasks:**

**Backend:**
- `npm install stripe` in `nestjs-backend/`
- `SubscriptionModule`: `Subscription` entity (userId, stripeCustomerId, stripePriceId, status, currentPeriodEnd)
- `POST /api/billing/checkout` — create Stripe Checkout Session; redirect to hosted page
- `POST /api/billing/webhook` (raw body parser bypass JWT auth) — handle `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- `SubscriptionGuard` — checks `subscription.status === 'active'`; apply to premium endpoints
- `UsageService` — tracks daily usage per userId per feature; stored in Redis (Sprint 7) with `EXPIRE` at midnight SGT

**Frontend:**
- `app/billing/page.tsx` — current plan, upgrade CTA, invoice history
- `PricingModal` — triggered when free-tier limit hit: "You've used your 5 recommendations today. Upgrade to Premium."
- Stripe hosted checkout redirect (no card form in-app → PCI compliance handled by Stripe)

**Dependencies:** Sprint 7 Redis (for usage tracking), Stripe account (apply early — review takes 1–2 days).

**Deliverables:**
- PRs: `feat(billing): Stripe subscription + usage gating` | `feat(frontend): billing page + pricing modal`
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PREMIUM` → Secrets Manager
- Terraform: `aws_api_gateway_usage_plan` for API key tier (partner API in Sprint 11)

**Risk & Mitigation:**
- Webhook replay attacks → validate `stripe.webhooks.constructEvent()` with signature; idempotency via `stripeEventId` in DB
- Tax/GST in Singapore → enable Stripe Tax (automatic GST calculation for SG customers)
- Free-tier enforcement: Redis outage → fail-open (allow request) with log alert, not fail-closed (block user)

**Testing:**
- Unit: `SubscriptionGuard` — mock subscription expired → expect 402 response
- Integration: Stripe CLI `stripe listen --forward-to localhost:8000/api/billing/webhook` → simulate checkout → verify `Subscription` created
- E2E: Playwright — hit free tier limit → pricing modal appears → Stripe checkout redirect

---

#### 4.25 Prompt-cost Optimiser

**Description:** Reduce LLM token consumption by 40–60% through prompt compression, response caching, and model routing by complexity.

**Tasks:**
- `PromptOptimizerService` in `intelligence/`:
  - `compress(prompt: string): string` — remove filler phrases, truncate chat history to last 6 turns, trim whitespace
  - `selectModel(complexity: 'simple'|'complex'): LlmProvider` — simple queries → Groq llama-3.3-70b (fast, cheap); complex reasoning → Claude Sonnet → Gemini
- Semantic response cache: hash `(endpoint, profileId, promptFingerprint)` → store LLM response in Redis with 24h TTL
- Token counting: `tiktoken` or Groq's token count API → log `tokensIn`, `tokensOut` per request in audit log
- CloudWatch metric: `LLM/TokensPerRequest` → alarm if P95 > 3000 tokens
- Monthly cost dashboard: `GET /api/admin/llm-costs` — aggregated from CloudWatch Logs Insights

**Dependencies:** Sprint 7 Redis (response cache), Sprint 1 Audit Logging (token metrics).

**Deliverables:**
- PRs: `feat(ai): prompt compression + semantic response cache + model routing`
- CloudWatch dashboard: token usage per day, cost estimate (Groq/Claude/Gemini pricing × tokens)

**Risk & Mitigation:**
- Semantic cache false positives (similar prompt, different user context) → include `profileId` in cache key always; never cache cross-user
- Model downgrade degrading quality → A/B test simple-vs-complex routing on 10% of requests; monitor user satisfaction signals (RAG feedback)

**Testing:**
- Unit: `compress()` — 2000-token prompt → output < 1500 tokens, semantic content preserved
- Integration: identical prompt twice → second call hits cache (verify Redis HIT in logs)
- Cost: 1-week token usage comparison before/after → assert ≥ 30% reduction

---

### Sprint 9 — AI Enhancements

---

#### 4.26 Multimodal Retrieval (Audio/Video)

**Description:** Allow users to upload audio/video career content (recorded elevator pitches, interview recordings) for transcription and RAG indexing.

**Tasks:**
- `TranscriptionService` — AWS Transcribe (async job); poll for completion; store transcript as `DocumentChunk` rows with `source: 'audio'`
- `POST /api/upload-media` — accepts `.mp3`, `.mp4`, `.webm` up to 50 MB; stores in S3; triggers Transcribe job
- `GET /api/upload-media/:jobId/status` — poll transcription status; returns `pending|completed|failed`
- On completion: `EmbeddingService.embedChunks(transcript)` → adds to RAG pipeline
- Frontend: `MediaUploadCard` in `app/profile/page.tsx` — drag-and-drop with media type filter

**Dependencies:** Sprint 4 PWA (camera/mic access on mobile), Sprint 1 request-size limits (override to 50 MB for `/api/upload-media`), S3 bucket (exists in Terraform).

**Deliverables:**
- PRs: `feat(ai): multimodal retrieval — audio transcription + RAG indexing` | `feat(frontend): media upload`
- Terraform: `aws_transcribe_*` IAM policy; S3 lifecycle rule (delete raw media after 30 days)

**Risk & Mitigation:**
- Transcribe cost: ~$0.024/minute → cap at 30-minute files; show cost estimate to user pre-upload
- PII in transcripts: Transcribe PII redaction feature → enable `ContentRedaction` for SSN, phone numbers

**Testing:**
- Integration: upload 10s `.mp3` → poll until `completed` → verify `document_chunk` rows in DB with `source='audio'`
- RAG: query about topic from transcript → RAG returns chunk from audio source

---

#### 4.27 Fine-tuned Domain LLM

**Description:** Fine-tune a smaller model (Llama 3.1 8B) on Singapore career coaching data to improve response accuracy and reduce latency.

**Tasks:**
- Data collection: export 1000+ curated Q&A pairs from interview sessions (Sprint 3) + career advice interactions; review and filter by admin
- Fine-tuning pipeline: AWS SageMaker Training Job (ml.g5.2xlarge, 4h estimated); base model: `meta-llama/Meta-Llama-3.1-8B-Instruct` from Hugging Face
- RLHF signal: use RAG feedback (`rag-feedback` entity) as preference labels
- Deploy: SageMaker Real-time Endpoint (or quantised GGUF on Lambda — 8B quantised to 4-bit ≈ 5 GB, feasible in 10 GB Lambda)
- `LlmService` — add `fineTuned` provider option; route simple career Q&A to fine-tuned model; complex reasoning to Groq/Claude
- Evaluation: BLEU + BERTScore on held-out test set; human eval on 50 samples

**Dependencies:** Sprint 3 (interview session data), Sprint 4 (RAG feedback data), Sprint 7 (SQS for async training pipeline).

**Deliverables:**
- PRs: `feat(ai): fine-tuned LLM integration + SageMaker endpoint`
- Terraform: `sagemaker.tf` module (already stubbed in infrastructure)
- Evaluation report: `docs/llm-evaluation.md`

**Risk & Mitigation:**
- Insufficient training data → minimum 500 high-quality pairs before fine-tuning; augment with synthetic data using Claude
- Model regression → A/B test: 50% traffic to fine-tuned, 50% to Groq; monitor user feedback score
- SageMaker endpoint cost: ~$0.70/hr for ml.g4dn.xlarge → auto-scale to 0 when no traffic using SageMaker Serverless Inference

**Testing:**
- Evaluation: held-out test set BERTScore ≥ 0.85 vs. base model
- Latency: fine-tuned endpoint p50 < 2s (vs. Groq ~1s — acceptable for domain accuracy gain)

---

### Sprint 10 — Monetisation II

---

#### 4.28 Corporate Portal

**Description:** B2B product: HR managers can create a tenant, invite employees, view aggregate skill gap analytics, and purchase bulk subscriptions.

**Tasks:**

**Backend:**
- Extend `Tenant` entity: `plan` (free|team|enterprise), `maxUsers`, `billingEmail`, `adminUserId[]`
- `CorporateModule`: `POST /api/corporate/tenants` — create corporate tenant; `GET /api/corporate/tenants/:id/analytics` — aggregate skill gaps + top missing skills across all employees
- `InviteService`: `POST /api/corporate/invite` — send invite email via SES; invited user joins tenant on registration
- Corporate Stripe plan: `STRIPE_PRICE_ID_TEAM` ($49/mo/up to 10 users), `STRIPE_PRICE_ID_ENTERPRISE` (custom)
- Role system: add `ROLE_ADMIN`, `ROLE_CORP_ADMIN`, `ROLE_USER` to JWT claims; guard corporate endpoints

**Frontend:**
- `app/corporate/page.tsx` — HR dashboard: employee list, aggregate heatmap, top skill gaps, bulk course recommendations
- `InviteEmployeeModal` — email input, send invite button
- `TenantBillingCard` — plan status, user count, upgrade CTA

**Dependencies:** Sprint 8 Stripe (billing), Sprint 2 Skill-Gap Dashboard (for aggregate analytics), Sprint 5 PDPA (consent for employer data access requires additional consent type).

**Deliverables:**
- PRs: `feat(corporate): multi-tenant corporate portal + HR analytics` | `feat(frontend): corporate HR dashboard`

**Risk & Mitigation:**
- Data isolation: corporate tenant must never see individual employees' raw data — aggregate only; enforce at query level with `GROUP BY` never `SELECT *`
- PDPA: employer access to employee skill data requires explicit employee consent (add `employerAnalytics` consent type in Sprint 5 consent system)

**Testing:**
- Unit: `CorporateAnalyticsService.aggregateGaps()` — 10 employee profiles → correct top-3 missing skills
- Multi-tenant isolation: employee A (tenant 1) → corporate portal of tenant 2 → receives 403

---

#### 4.29 Job Board Integrations

**Description:** Ingest real job listings from JobsDB, MyCareersFuture (Singapore government), and LinkedIn Jobs API for alert matching and recommendations.

**Tasks:**
- `JobIngestionModule`: daily n8n workflow + `POST /internal/sync/jobs` endpoint
- MyCareersFuture API (free, Singapore government): `GET https://api.mycareersfuture.gov.sg/jobs?search=...` — paginate and ingest into `job_listing` table
- LinkedIn Jobs API (requires LinkedIn partner approval — start application Sprint 8)
- `job_listing` entity: id, title, company, salaryMin, salaryMax, skills[], location, postedAt, source, externalId, url
- `RecommendationService` fallback: if `job_roles` table has no matches, query `job_listing` table
- `GET /api/jobs?search=&skills[]=&salaryMin=` — live job search

**Frontend:**
- `app/jobs/page.tsx` — live job board with search + filters
- Job card: company logo, title, salary range, skill match %, "Save" button (triggers job alert creation)

**Dependencies:** Sprint 3 Job Alerts (saved jobs → alerts), Sprint 6 Salary Estimator (salary range filter).

**Deliverables:**
- PRs: `feat(jobs): MyCareersFuture + LinkedIn ingestion pipeline` | `feat(frontend): live job board`
- n8n workflow: `job_ingestion.json`

**Risk & Mitigation:**
- MyCareersFuture rate limit: 60 req/min → paginate with 500ms delay between pages
- LinkedIn Jobs API: requires partner approval (may take 4–6 weeks) → ship MyCareersFuture first; LinkedIn as Sprint 11 stretch goal

**Testing:**
- Integration: trigger ingestion → assert 50+ `job_listing` rows created
- Search: `GET /api/jobs?skills[]=python&salaryMin=5000` → results relevant and salary-filtered

---

### Sprint 11 — Infra II + Open API

---

#### 4.30 Open API (Partner Tier)

**Description:** Expose a documented, API-key-gated partner API allowing third parties (bootcamps, staffing agencies) to query recommendations and skill gaps.

**Tasks:**
- API key management: `ApiKey` entity (tenantId, keyHash, name, scopes[], rateLimit, createdAt, lastUsedAt)
- `ApiKeyGuard` — validates `X-API-Key` header; replaces JWT for partner endpoints
- Partner endpoints (subset of existing API, versioned at `/v1/`):
  - `POST /v1/recommend` — job recommendations
  - `POST /v1/skill-gap` — skill gap analysis
  - `GET /v1/roles` — role catalog
- API Gateway Usage Plans: 1000 req/day free partner tier; custom plan for paid partners
- Developer portal: `app/developer/page.tsx` — API key generation, docs (embed Swagger UI from `/api-docs`)
- OpenAPI spec: `openapi.yaml` fully updated to v1 schema; serve via `@nestjs/swagger`

**Dependencies:** Sprint 8 Stripe (paid partner tiers), Sprint 7 OTel (partner usage metrics).

**Deliverables:**
- PRs: `feat(api): partner API key system + versioned endpoints + developer portal`
- `openapi.yaml` v1.0.0 — published to GitHub Pages

**Risk & Mitigation:**
- API key leakage: store only `SHA-256(key)` in DB; present full key only at creation time
- Partner abuse: per-key rate limit enforced at API Gateway (`aws_api_gateway_usage_plan`)

**Testing:**
- Contract: OpenAPI spec passes `spectral lint` with zero errors
- Security: attempt partner key on internal endpoint → 403

---

#### 4.31 Canary / Blue-Green Deployment

**Description:** Implement canary deployments for Lambda (10% → 50% → 100% traffic shift) with automatic rollback on error rate threshold.

**Tasks:**
- Lambda aliases: `live` (production traffic) and `canary` (new version, 10% weight)
- `aws_lambda_alias` + `aws_lambda_function_event_invoke_config` Terraform resources
- API Gateway → Lambda alias with `${stageVariables.lambdaAlias}` routing
- CloudWatch alarm: `errors/requests > 1%` over 5 minutes → triggers `aws_lambda_alias` weight rollback to 0%
- CI pipeline: `deploy-serverless.yml` — add `canary_deploy` job between `build` and `promote_to_live`:
  1. Deploy new image to ECR
  2. Update Lambda alias `canary` to new version; set weight 10%
  3. Wait 10 min; check CloudWatch alarm state
  4. If OK: promote `live` alias to new version; set `canary` weight 0%
  5. If ALARM: rollback (keep `live` on old version)

**Dependencies:** Sprint 5 Secrets Rotation (GitHub OIDC for CI already set up).

**Deliverables:**
- PRs: `feat(infra): Lambda canary deployment + auto-rollback`
- Terraform: updated `lambda_backend` module with alias + weighted routing
- Runbook: `docs/deployment-runbook.md`

**Testing:**
- Staging: deploy canary with intentional 500 error → verify alarm triggers → rollback confirmed
- Load: `autocannon` during canary shift → verify 10% traffic goes to new version (check X-Ray trace distribution)

---

### Sprint 12 — Compliance & Launch

---

#### 4.32 Penetration Testing Pipeline

**Tasks:**
- OWASP ZAP full active scan in CI: `zaproxy/action-full-scan@v0.10.0` against staging URL after deployment
- `truffleHog3` secrets scan on every PR (already added in Sprint 1 — verify still running)
- `npm audit --audit-level=high` gate in CI for both `frontend/` and `nestjs-backend/`
- Dependency scanning: `dependabot` alerts enabled on GitHub (if not already)
- Manual pentest: engage external firm for black-box test on staging (schedule in Sprint 11)
- Findings triage: Critical/High → fix before go-live; Medium → fix within 30 days; Low → accept and document

**Deliverables:**
- `docs/pentest-report.md` — findings + remediation status
- CI gate: ZAP scan zero High+ findings before prod deploy

---

#### 4.33 SOC-2 / ISO 27001 Readiness

**Tasks:**
- Evidence collection: CloudTrail enabled (all regions), Config Rules enabled, GuardDuty enabled
- Access control review: IAM least-privilege audit (Sprint 1 hardening → formal evidence)
- Encryption at rest: Aurora encrypted (verify TF config), S3 SSE-KMS, Secrets Manager CMK (Sprint 5)
- Incident response runbook: `docs/incident-response.md`
- Vendor assessment: Stripe, Groq, Anthropic, Google (obtain their SOC-2 reports for vendor risk register)
- Business Continuity Plan: Aurora automated backups (5-day retention), S3 versioning enabled

**Deliverables:**
- `docs/soc2-evidence/` directory — checklist + evidence artefacts
- AWS Trusted Advisor + Security Hub score ≥ 80%

---

## 5. Infrastructure Changes

### Terraform Modules (New / Modified)

| Module | Change | Sprint |
|--------|--------|--------|
| `modules/backend/lambda.tf` | Add alias + weighted routing for canary | S11 |
| `modules/elasticache/` | New: ElastiCache Serverless Redis | S7 |
| `modules/sqs/` | New: SQS standard queue + DLQ | S7 |
| `modules/eventbridge/` | Add SQS targets for automation Lambdas | S7 |
| `modules/iam/` | OIDC provider for GitHub Actions | S5 |
| `modules/kms/` | CMK for Secrets Manager + S3 + Aurora | S5 |
| `modules/api_gateway/` | Usage plans for partner API keys | S11 |
| `modules/ses/` | Email identity + sending quota increase | S3 |
| `modules/cloudwatch/` | OTel dashboard + canary alarms | S7, S11 |
| `modules/sagemaker/` | Fine-tune + inference endpoint | S9 |
| `modules/transcribe/` | IAM policy for Transcribe | S9 |

### CI Pipeline Jobs (New)

```yaml
# .github/workflows/deploy-serverless.yml — new jobs to add per sprint

# S1: Security gates
security-scan:
  runs-on: ubuntu-latest
  steps:
    - uses: gitleaks/gitleaks-action@v2
    - run: npm audit --audit-level=high --prefix nestjs-backend
    - run: npm audit --audit-level=high --prefix frontend

# S8: Accessibility gate
a11y-check:
  needs: deploy-staging
  runs-on: ubuntu-latest
  steps:
    - run: npx playwright test a11y/

# S11: Canary deploy
canary-deploy:
  needs: [build-and-push]
  steps:
    - run: aws lambda update-alias --function-name skillbridge-backend --name canary --routing-config AdditionalVersionWeights={"$LATEST"=0.1}
    - run: sleep 600  # 10 min soak
    - run: |
        STATE=$(aws cloudwatch describe-alarms --alarm-names skillbridge-canary-error-rate --query 'MetricAlarms[0].StateValue' --output text)
        if [ "$STATE" = "ALARM" ]; then exit 1; fi
    - run: aws lambda update-alias --function-name skillbridge-backend --name live --function-version $LATEST_VERSION

# S12: ZAP scan
zap-scan:
  needs: deploy-staging
  steps:
    - uses: zaproxy/action-full-scan@v0.10.0
      with:
        target: ${{ env.STAGING_URL }}
        fail_action: true
        rules_file_name: .zap/rules.tsv
```

---

## 6. Deployment & Roll-out

### General Strategy

All features use the existing `deploy-serverless.yml` workflow. For code-only changes:
```bash
gh workflow run deploy-serverless.yml -f environment=dev -f skip_terraform=true
```
For Terraform changes (new resources), use full deploy:
```bash
gh workflow run deploy-serverless.yml -f environment=dev
```

### Feature Flags

Use environment variables as feature flags for gradual roll-out:

```typescript
// common/config/env.validation.ts — add feature flags
FEATURE_REDIS_CACHE = process.env.FEATURE_REDIS_CACHE === 'true'  // S7
FEATURE_SUBSCRIPTIONS = process.env.FEATURE_SUBSCRIPTIONS === 'true'  // S8
FEATURE_FINE_TUNED_LLM = process.env.FEATURE_FINE_TUNED_LLM === 'true'  // S9
```

Set in Lambda environment via Terraform; toggle without redeployment using `aws lambda update-function-configuration`.

### Rollback Plan

| Scenario | Rollback Action | Time-to-rollback |
|----------|----------------|-----------------|
| Bad Lambda code | `aws lambda update-alias --name live --function-version PREV_VERSION` | < 2 min |
| Bad Terraform infra | `terraform destroy -target='module.X'` then reapply previous state | 10–30 min |
| Bad DB migration | `updateSchema()` is additive-only — no rollback needed for new columns. For destructive changes: restore Aurora snapshot | 15 min |
| Bad Redis config | Set `FEATURE_REDIS_CACHE=false` → falls back to in-memory | < 2 min |
| Stripe webhook issues | Disable webhook in Stripe dashboard; re-process via CLI | < 5 min |

---

## 7. Security & Compliance Checklist

### Pre-Launch Gate (Sprint 12)

**Authentication & Authorisation**
- [ ] JWT tokens expire after 15 minutes; refresh token rotation implemented
- [ ] `OptionalJwtAuthGuard` endpoints default to tenant ID 1 (no data leakage)
- [ ] Corporate portal enforces tenant isolation (query-level `tenantId` filter)
- [ ] API keys stored as `SHA-256` hash only
- [ ] GitHub Actions uses OIDC (no static AWS keys)

**Transport & Encryption**
- [ ] All traffic over HTTPS (CloudFront + ACM certificate)
- [ ] `Strict-Transport-Security` header set via CloudFront response headers policy
- [ ] Aurora encrypted at rest (AES-256 via KMS CMK)
- [ ] S3 buckets: SSE-KMS, Block Public Access enabled, versioning on
- [ ] Secrets Manager: all secrets encrypted with CMK

**Input Validation & Injection**
- [ ] JSON body size limit: 10 KB globally; 10 MB for file uploads
- [ ] All user inputs validated via `class-validator` DTOs with `forbidNonWhitelisted: true`
- [ ] MikroORM query builder used everywhere — no raw SQL string concatenation
- [ ] Helmet CSP headers enforced; `unsafe-inline` removed by Sprint 3
- [ ] File upload: MIME type validation + virus scan (ClamAV Lambda in Sprint 9)

**Rate Limiting & DoS**
- [ ] Global: 60 req/min per IP (`@nestjs/throttler`)
- [ ] Auth endpoints: 10 req/min per IP
- [ ] LLM endpoints: 10 req/min per IP
- [ ] API Gateway account-level throttle: 10K req/s
- [ ] Redis-backed rate limiting for cross-Lambda accuracy (Sprint 7)

**Secrets & Configuration**
- [ ] No secrets in `.env.example`, `CLAUDE.md`, or any committed file
- [ ] All secrets in Secrets Manager at `/skillbridge/{env}/{key}`
- [ ] Secrets rotation enabled: DB password (30 days), JWT secret (90 days)
- [ ] `gitleaks` CI gate: zero findings
- [ ] `npm audit --audit-level=high`: zero high/critical findings

**Audit & Observability**
- [ ] Every auth event, data mutation, LLM call logged with `userId`, `ip`, `action`, `outcome`
- [ ] CloudTrail enabled in all regions
- [ ] CloudWatch alarms: LLM error rate, DLQ depth, canary error rate, SES bounce rate
- [ ] X-Ray active tracing on all Lambda functions
- [ ] Log retention: 30 days (dev), 90 days (prod); audit logs: 365 days

**Privacy & Compliance**
- [ ] PDPA consent recorded at registration with version tracking
- [ ] Right-to-erasure `DELETE /api/users/:id/data` implemented and tested
- [ ] Data export `GET /api/users/:id/data-export` implemented
- [ ] No PII in LLM prompts or RAG chunk content (email, NRIC redacted)
- [ ] Employer analytics require explicit employee consent
- [ ] Cookie banner for analytics cookies (Sprint 8)

**Penetration Testing**
- [ ] OWASP ZAP full active scan: zero High+ findings
- [ ] External pentest completed on staging
- [ ] All Critical/High findings resolved

---

## 8. High-Level Timeline

```
Week  1–2   [S1]  Security Hardening          ← MUST ship before any other feature
Week  3–4   [S2]  Skill-Gap Dashboard, Roadmap
Week  5–6   [S3]  Interview Bot, Job Alerts
Week  7–8   [S4]  Progress Tracker, Dark Mode, PWA
Week  9–10  [S5]  LinkedIn Import, GDPR/PDPA, Secrets Rotation
Week 11–12  [S6]  Salary Estimator, Micro-learning
Week 13–14  [S7]  Knowledge Graph, Redis, SQS, OTel
Week 15–16  [S8]  WCAG, i18n, Stripe, Prompt Optimiser
Week 17–18  [S9]  Multimodal RAG, Fine-tuned LLM
Week 19–20 [S10]  Corporate Portal, Job Board
Week 21–22 [S11]  Open API, Canary Deploys, Micro-service Spike
Week 23–24 [S12]  Pentest, SOC-2, Go-live sign-off
─────────────────────────────────────────────────────
              GO-LIVE: End of Week 24
```

### Milestones

| Milestone | Week | Gate Criteria |
|-----------|------|---------------|
| **Security Hardened** | 2 | OWASP ZAP baseline: zero High+; gitleaks: zero findings |
| **Core Product Beta** | 6 | Skill-gap, roadmap, interview, alerts all functional in staging |
| **Compliance Ready** | 10 | PDPA consent, secrets rotation, audit logging verified |
| **Analytics Live** | 14 | Knowledge graph, salary estimator, OTel dashboard operational |
| **Monetisation Ready** | 16 | Stripe checkout e2e working; usage gating verified |
| **AI Enhanced** | 18 | Fine-tuned model A/B live; multimodal RAG returning results |
| **Enterprise Ready** | 20 | Corporate portal with 1 pilot customer |
| **Go-live** | 24 | All P0/P1 features live; pentest complete; SOC-2 evidence collected |

---

## 9. Appendix

### A. Helmet CSP Configuration (Sprint 1)

```typescript
// nestjs-backend/src/main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],          // Remove unsafe-inline by Sprint 3 using nonces
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind requires inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: [],                   // Updated to add YouTube in Sprint 6
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  crossOriginEmbedderPolicy: false,   // Required for Three.js canvas
}));
```

### B. Throttler Behind Proxy (Sprint 1)

```typescript
// nestjs-backend/src/common/guards/throttler-proxy.guard.ts
import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // API Gateway sets X-Forwarded-For; take first IP (client, not proxy)
    const forwardedFor = req.headers['x-forwarded-for'];
    return forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip;
  }
}
```

### C. Canary Lambda Alias Terraform (Sprint 11)

```hcl
# terraform/modules/lambda_backend/canary.tf
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.backend.arn
  function_version = aws_lambda_function.backend.version

  routing_config {
    additional_version_weights = {
      (aws_lambda_function.backend.version) = 0  # Will be updated to 0.1 by CI
    }
  }
}

resource "aws_cloudwatch_metric_alarm" "canary_error_rate" {
  alarm_name          = "skillbridge-canary-error-rate"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Rate"
  threshold           = 0.01  # 1% error rate
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
  ok_actions          = [aws_sns_topic.ops_alerts.arn]
}
```

### D. Stripe Webhook (Sprint 8)

```typescript
// nestjs-backend/src/billing/billing.controller.ts
@Post('webhook')
@HttpCode(200)
async handleWebhook(
  @Req() req: RawBodyRequest<Request>,
  @Headers('stripe-signature') sig: string,
) {
  let event: Stripe.Event;
  try {
    event = this.stripe.webhooks.constructEvent(
      req.rawBody,            // requires rawBody: true in NestJS bootstrap
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    throw new BadRequestException(`Webhook signature verification failed`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await this.subscriptionService.activate(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.deleted':
      await this.subscriptionService.deactivate(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await this.subscriptionService.handlePaymentFailure(event.data.object as Stripe.Invoice);
      break;
  }

  return { received: true };
}
```

### E. Usage Gating Pattern (Sprint 8)

```typescript
// nestjs-backend/src/common/guards/usage.guard.ts
@Injectable()
export class UsageGuard implements CanActivate {
  constructor(
    private readonly usageService: UsageService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return true;  // Unauthenticated requests handled by feature limits

    const isPremium = await this.subscriptionService.isActive(user.id);
    if (isPremium) return true;

    const feature = Reflect.getMetadata('feature', context.getHandler());
    const limit = FREE_TIER_LIMITS[feature];
    const usage = await this.usageService.getToday(user.id, feature);

    if (usage >= limit) {
      throw new HttpException({
        statusCode: 402,
        message: `Free tier limit reached for ${feature}`,
        upgradeUrl: '/billing',
      }, 402);
    }

    await this.usageService.increment(user.id, feature);
    return true;
  }
}
```

### F. OpenTelemetry Bootstrap (Sprint 7)

```typescript
// nestjs-backend/src/telemetry.ts  — must be imported FIRST in main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },  // Too noisy
    }),
  ],
  serviceName: 'skillbridge-backend',
});

sdk.start();

// nestjs-backend/src/main.ts — first line:
import './telemetry';
```

---

*Document version: 1.0 — Generated for SkillBridge capstone project, March 2026. Update this document at the start of each sprint with progress, revised estimates, and new blockers discovered.*
