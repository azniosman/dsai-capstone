/**
 * lib/api.ts — Typed API service layer for SkillBridge.
 *
 * All backend calls go through this file.
 * Import the typed functions instead of calling `api` (axios) directly.
 *
 * Connection: Axios instance in lib/api-client.ts
 *   - Base URL: NEXT_PUBLIC_API_URL env var (defaults to "")
 *   - Auto-attaches Bearer token from localStorage
 *   - Auto-refreshes on 401
 *   - Redirects to /login on auth failure
 */

import api from "./api-client";

// ─────────────────────────────────────────────
// Shared entity types
// ─────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Profile {
  id: number;
  user_id: number | null;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  education: string | null;
  years_experience: number;
  is_career_switcher: boolean;
  skills: string[];
  tenant_id: number;
  created_at: string;
  updated_at?: string;
}

export interface Recommendation {
  title: string;
  match_score: number;
  skill_match_quality: "strong" | "moderate" | "developing" | "high" | "medium" | "low";
  role_id?: number;
  category?: string;
  salary_range?: string;
  content_score?: number;
  rule_score?: number;
  career_switcher_bonus?: number;
  career_switcher_friendly?: boolean;
  matched_skills?: string[];
  missing_skills?: string[];
  rationale?: string;
}

export interface RecommendationsResponse {
  profile_id: number;
  recommendations: Recommendation[];
}

export interface GapItem {
  skill: string;
  gap_severity?: "none" | "low" | "medium" | "high";
  gapSeverity?: "none" | "low" | "medium" | "high";
  user_level?: number;
  required_level?: string | number;
  user_level_label?: string;
  priority?: string;
}

export interface RoleGap {
  role_title?: string;
  targetRole?: string;
  role_id?: number;
  match_score?: number;
  gaps: GapItem[];
}

export interface SkillGapResponse {
  profile_id: number;
  // Backend returns `gaps` (not `skill_gaps`)
  gaps: RoleGap[];
}

export interface RoadmapCourse {
  course_id: number;
  title: string;
  provider: string;
  duration: string;
  level: string;
  skills: string[];
  is_certified: boolean;
  mces_eligible: boolean;
  skillsfuture_credit: number;
  course_fee: number;
  subsidy_pct: number;
  nett_fee: number;
  week_start: number;
  week_end: number;
}

export interface RoadmapSummary {
  total_weeks: number;
  total_courses: number;
  total_fee: number;
  nett_fee: number;
  skillsfuture_credit: number;
  mces_eligible: boolean;
}

export interface RoadmapResponse {
  profile_id: number;
  target_role: string;
  summary: RoadmapSummary;
  roadmap: RoadmapCourse[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  engine: string;
}

export interface JDMatchGap {
  skill: string;
  user_level: number;
  gap_severity: string;
  required_level: string;
  user_level_label: string;
  priority: string;
}

export interface JDMatchResult {
  job_title: string;
  match_score: number;
  extracted_skills: string[];
  gaps: JDMatchGap[];
}


export interface DashboardSummary {
  profile_id: number;
  name: string;
  education: string | null;
  years_experience: number;
  is_career_switcher: boolean;
  skills: string[];
  skills_count: number;
  recommendations_count: number;
  gaps_identified: number;
  progress_entries: number;
  career_readiness: number;
  skills_delta: number;
  recommendations_delta: number;
  gaps_delta: number;
}

export interface Course {
  id: number;
  title: string;
  provider: string;
  duration: string;
  level: string;
  skills: string[];
  is_certified: boolean;
  mces_eligible: boolean;
  skillsfuture_credit: number;
  course_fee: number;
}

export interface Role {
  id: number;
  title: string;
  category: string;
  salary_min: number;
  salary_max: number;
  required_skills: string[];
}

export interface ResumeUploadResult {
  // Fields returned by NestJS backend
  name?: string;
  email?: string;
  phone?: string;
  skills: string[];
  experience_years?: number;
  raw_text_preview?: string;
  // Fields from full implementation
  profile_id?: number;
  readiness_score?: number;
  strengths?: string[];
  missing_skills?: string[];
  recommended_courses?: string[];
  suggested_roles?: string[];
}

export interface SubsidyResult {
  course_fee: number;
  subsidy_amount: number;
  subsidy_pct: number;
  skillsfuture_credit: number;
  nett_payable: number;
  mces_eligible: boolean;
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

export const authApi = {
  /**
   * Register a new user account.
   * Backend RegisterDto expects camelCase: passwordConfirm, tenantName.
   */
  register: (payload: {
    name: string;
    email: string;
    password: string;
    passwordConfirm: string;
    tenantName?: string;
    profileId?: number;
  }) =>
    api
      .post<{ id: number; email: string; name: string }>("/api/auth/register", {
        ...payload,
        tenantName: payload.tenantName ?? "Global",
      })
      .then((r) => r.data),

  /**
   * Login and receive JWT tokens.
   * Backend LocalAuthGuard uses passport-local with usernameField: 'username'.
   * Must send as application/x-www-form-urlencoded with `username` field.
   */
  login: (payload: { email: string; password: string }) => {
    const params = new URLSearchParams();
    params.append("username", payload.email);
    params.append("password", payload.password);
    return api
      .post<{
        access_token: string;
        refresh_token?: string;
        token_type: string;
      }>("/api/auth/login", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      })
      .then((r) => r.data);
  },

  /** Fetch the currently authenticated user */
  me: () => api.get<User>("/api/auth/me").then((r) => r.data),

  /** Logout and invalidate refresh token */
  logout: (refreshToken: string) =>
    api.post("/api/auth/logout", { refresh_token: refreshToken }),
};

// ─────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────

export const profileApi = {
  /** Create or update a user profile */
  create: (payload: {
    name: string;
    education?: string;
    years_experience?: number;
    is_career_switcher?: boolean;
    skills?: string[];
    email?: string;
    phone?: string;
    location?: string;
  }) => api.post<Profile>("/api/profile", payload).then((r) => r.data),

  /** Get the profile linked to the current user */
  me: () => api.get<Profile>("/api/profile/me").then((r) => r.data),

  /** Update profile by ID (PATCH) */
  update: (id: number, payload: Partial<Profile>) =>
    api.patch<Profile>(`/api/profile/${id}`, payload).then((r) => r.data),
};

// ─────────────────────────────────────────────
// Resume
// ─────────────────────────────────────────────

export const resumeApi = {
  /**
   * Upload a PDF or DOCX resume.
   * Returns extracted name, email, phone, skills, experience_years.
   */
  upload: (
    file: File,
    profileId?: number,
    onProgress?: (pct: number) => void,
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (profileId) form.append("profile_id", String(profileId));

    return api
      .post<ResumeUploadResult>("/api/upload-resume", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },
};

// ─────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────

export const recommendApi = {
  /** Get job recommendations for a profile */
  get: (profileId: number) =>
    api
      .post<RecommendationsResponse>("/api/recommend", {
        profile_id: profileId,
      })
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Skill Gap
// ─────────────────────────────────────────────

export const skillGapApi = {
  /** Get skill gap analysis for a profile */
  get: (profileId: number) =>
    api
      .get<SkillGapResponse>(`/api/skill-gap/${profileId}`)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Roadmap
// ─────────────────────────────────────────────

export const roadmapApi = {
  /** Get upskilling roadmap for a profile */
  get: (profileId: number) =>
    api
      .get<RoadmapResponse>(`/api/upskilling/${profileId}`)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Chat / AI Coach
// ─────────────────────────────────────────────

export const chatApi = {
  /**
   * Send a message to the AI career coach.
   * Backend returns JSON { reply, engine } (not an SSE stream).
   * This function adapts the JSON response to the streaming callback interface
   * so ChatCoach works without changes: emits [ENGINE:...] then the reply.
   */
  sendStream: async (
    payload: { profile_id?: number | null; messages: ChatMessage[] },
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    const res = await api.post<ChatResponse>("/api/chat", payload);
    const { reply, engine } = res.data;

    // Emit engine tag first so ChatCoach's engine-detection regex picks it up
    if (engine) {
      onChunk(`[ENGINE: ${engine}]\n`);
    }

    // Emit the full reply as a single chunk
    onChunk(reply ?? "");
  },
};

// ─────────────────────────────────────────────
// JD Match
// ─────────────────────────────────────────────

export const jdMatchApi = {
  /** Match a user profile against a raw job description */
  match: (payload: {
    profile_id: number;
    job_description: string;
    job_title?: string;
  }) => api.post<JDMatchResult>("/api/jd-match", payload).then((r) => r.data),
};


// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────

export const dashboardApi = {
  /** Get the authenticated user's dashboard summary */
  summary: () =>
    api.get<DashboardSummary>("/api/dashboard/summary").then((r) => r.data),
};

// ─────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────

export const coursesApi = {
  /** List all SCTP courses */
  list: () => api.get<Course[]>("/api/courses").then((r) => r.data),

  /** Calculate SkillsFuture subsidy for a course */
  calculateSubsidy: (payload: {
    course_id: number;
    profile_id?: number;
    is_career_switcher?: boolean;
  }) =>
    api
      .post<SubsidyResult>("/api/calculate-subsidy", payload)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────

export const rolesApi = {
  /** List all job roles */
  list: () => api.get<Role[]>("/api/roles").then((r) => r.data),
};


// ─────────────────────────────────────────────
// SSG / SkillsFuture API
// ─────────────────────────────────────────────

export interface SsgCourse {
  referenceNumber: string;
  title: string;
  provider: string;
  totalCostOfTrainingPerTrainee?: number;
  subsidisedFee?: number;
  skillsFrameworkSkillCodes?: string[];
  objectives?: string;
  modeOfTraining?: string;
  totalTrainingDurationHour?: number;
  registrationClosingDate?: string;
  url?: string;
  /** Data source indicator */
  source: "live" | "cached" | "seeded";
  matchedSkills?: string[];
  /** Only present on recommended courses */
  relevanceScore?: number;
}

export interface PaginatedSsgCoursesResponse {
  data: SsgCourse[];
  total: number;
  limit: number;
  offset: number;
  source: "live" | "cached" | "seeded";
}

export interface SsgJobRole {
  jobRoleCode: string;
  jobRoleTitle: string;
  jobRoleDescription?: string;
  sector?: string;
}

export const ssgApi = {
  /**
   * Search SkillsFuture / SSG courses.
   * Falls back to seeded data when SSG credentials are not configured on the backend.
   */
  searchCourses: (params: {
    keyword?: string;
    skill?: string;
    limit?: number;
    offset?: number;
  }) =>
    api
      .get<PaginatedSsgCoursesResponse>("/api/ssg/courses/search", {
        params,
      })
      .then((r) => r.data),

  /** Get a single SSG course by reference number (e.g. "TGS-2023012345") */
  getCourse: (referenceNumber: string) =>
    api
      .get<SsgCourse>(`/api/ssg/courses/${encodeURIComponent(referenceNumber)}`)
      .then((r) => r.data),

  /** List WSG SkillsFramework job roles, optionally filtered by sector */
  getJobRoles: (sector?: string) =>
    api
      .get<SsgJobRole[]>("/api/ssg/job-roles", { params: sector ? { sector } : {} })
      .then((r) => r.data),

  /**
   * Get personalised SSG course recommendations scored by skill overlap.
   * Returns top 10 courses ranked by relevanceScore.
   */
  getRecommendations: (payload: {
    skills: string[];
    targetRole?: string;
    profileId?: number;
  }) =>
    api
      .post<{
        profileId: number | null;
        targetRole: string | null;
        courses: SsgCourse[];
      }>("/api/ssg/recommendations", payload)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Market Insights
// ─────────────────────────────────────────────

export interface MarketInsight {
  role_category: string;
  demand_level: string;
  avg_salary_sgd: number;
  yoy_growth_pct: number;
  hiring_volume: number;
  trending_skills: string[];
  forecast_2026?: string;
  outlook?: string;
}

export interface MarketInsightsResponse {
  top_skills_overall: string[];
  highest_demand_sectors: string[];
  insights: MarketInsight[];
  last_updated?: string;
}

export const marketApi = {
  /** Get Singapore labour market insights aggregated by sector. */
  get: () =>
    api.get<MarketInsightsResponse>("/api/market-insights").then((r) => r.data),
};

// ─────────────────────────────────────────────
// Compare Roles
// ─────────────────────────────────────────────

export const compareApi = {
  /** Compare a profile against multiple job roles simultaneously. */
  compare: (payload: { profile_id: number; role_ids: number[] }) =>
    api
      .post<{ comparisons: Recommendation[] }>("/api/compare-roles", payload)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Skill Progress
// ─────────────────────────────────────────────

export interface ProgressEntry {
  skill: string;
  level: number;
  recorded_at?: string;
}

export interface ProgressResponse {
  skills_acquired: number;
  skills_in_progress: number;
  skills_total: number;
  entries: ProgressEntry[];
}

export const progressApi = {
  /** Record a skill progress update. */
  record: (payload: { profile_id: number; skill: string; level: number }) =>
    api.post<ProgressEntry>("/api/progress", payload).then((r) => r.data),

  /** Get the progress dashboard for a profile. */
  get: (profileId: number) =>
    api
      .get<ProgressResponse>(`/api/progress/${profileId}`)
      .then((r) => r.data),

  /** Get skill progress timeline for a profile. */
  timeline: (profileId: number) =>
    api
      .get<{ timeline: ProgressEntry[] }>(`/api/progress/${profileId}/timeline`)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Resume Rewriter
// ─────────────────────────────────────────────

export const resumeRewriterApi = {
  /** Rewrite a resume bullet point for a target role using the LLM chain. */
  rewrite: (bullet: string, targetRole: string, profileId?: number) =>
    api
      .post<{ rewritten_bullet: string; engine: string }>("/api/resume-rewriter", {
        bullet,
        target_role: targetRole,
        profile_id: profileId,
      })
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Interview
// ─────────────────────────────────────────────

export const interviewApi = {
  /** Send a message to the AI mock interviewer. */
  chat: (jobTitle: string, messages: ChatMessage[], profileId?: number) =>
    api
      .post<{ reply: string; engine: string }>("/api/interview", {
        job_title: jobTitle,
        messages,
        profile_id: profileId,
      })
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// RAG
// ─────────────────────────────────────────────

export interface RagChunk {
  id: number;
  content: string;
  source_type: string;
  score?: number;
}

export const ragApi = {
  /** Hybrid pgvector + tsvector RAG retrieval. */
  query: (query: string, topK = 5) =>
    api
      .post<{ chunks: RagChunk[]; total: number }>("/api/rag/query", {
        query,
        top_k: topK,
      })
      .then((r) => r.data),

  /** Record a thumbs-up/down feedback signal for re-ranking. */
  feedback: (
    chunkId: number,
    queryText: string,
    isPositive: boolean,
    profileId?: number,
  ) =>
    api
      .post<{ recorded: boolean }>("/api/rag/feedback", {
        chunk_id: chunkId,
        query_text: queryText,
        is_positive: isPositive,
        profile_id: profileId,
      })
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Export convenience re-export of raw axios client
// ─────────────────────────────────────────────
export { default as apiClient } from "./api-client";
