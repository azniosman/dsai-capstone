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
  education: string | null;
  years_experience: number;
  is_career_switcher: boolean;
  skills: string[];
  tenant_id: number;
  created_at: string;
  updated_at?: string;
}

export interface Recommendation {
  role_id: number;
  title: string;
  category: string;
  salary_range?: string;
  match_score: number;
  content_score: number;
  rule_score: number;
  skill_match_quality: "strong" | "moderate" | "developing";
  career_switcher_bonus: number;
  matched_skills: string[];
  missing_skills: string[];
  rationale: string;
}

export interface RecommendationsResponse {
  profile_id: number;
  recommendations: Recommendation[];
}

export interface GapItem {
  skill: string;
  user_level: number;
  required_level: string;
  user_level_label: string;
  gap_severity: "none" | "low" | "medium" | "high";
  priority: string;
}

export interface RoleGap {
  role_id: number;
  role_title: string;
  match_score: number;
  gaps: GapItem[];
}

export interface SkillGapResponse {
  profile_id: number;
  skill_gaps: RoleGap[];
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

export interface JDMatchResult {
  match_score: number;
  extracted_skills: string[];
  gaps: GapItem[];
}

export interface MarketCategory {
  category: string;
  demand_level: string;
  avg_salary_monthly: number;
  job_openings: number;
  yoy_growth_pct: number;
  top_skills: string[];
  forecast_2026: string;
  outlook: string;
}

export interface MarketInsightsResponse {
  top_skills: string[];
  fastest_growing_sectors: string[];
  categories: MarketCategory[];
  generated_at?: string;
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
  skills: string[];
  experience_years?: number;
  raw_text_preview?: string;
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
  /** Register a new user account */
  register: (payload: { name: string; email: string; password: string }) =>
    api
      .post<{
        access_token: string;
        refresh_token?: string;
        user: User;
      }>("/api/auth/register", payload)
      .then((r) => r.data),

  /** Login and receive JWT tokens */
  login: (payload: { email: string; password: string }) =>
    api
      .post<{
        access_token: string;
        refresh_token?: string;
        user: User;
      }>("/api/auth/login", payload)
      .then((r) => r.data),

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
  }) => api.post<Profile>("/api/profile", payload).then((r) => r.data),

  /** Get the profile linked to the current user */
  me: () => api.get<Profile>("/api/profile/me").then((r) => r.data),

  /** Update profile by ID */
  update: (id: number, payload: Partial<Profile>) =>
    api.put<Profile>(`/api/profile/${id}`, payload).then((r) => r.data),
};

// ─────────────────────────────────────────────
// Resume
// ─────────────────────────────────────────────

export const resumeApi = {
  /**
   * Upload a PDF or DOCX resume.
   * Returns extracted skills, experience, and optional profile_id.
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
   * Send a message to the AI career coach and stream the response.
   * Messages must include the full conversation history.
   * On chunk received, it fires the `onChunk` callback.
   */
  sendStream: async (
    payload: { profile_id?: number | null; messages: ChatMessage[] },
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    try {
      // We use raw fetch here because axios doesn't natively support ReadableStream
      // in the browser easily without custom adapters.
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('skillbridge_access_token') : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not yet supported in this browser.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        onChunk(chunk);
      }
    } catch (e) {
      console.error("Stream failed:", e);
      throw e;
    }
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
// Market Insights
// ─────────────────────────────────────────────

export const marketApi = {
  /** Get Singapore tech market insights */
  get: () =>
    api.get<MarketInsightsResponse>("/api/market-insights").then((r) => r.data),
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
    is_sme?: boolean;
    is_mces?: boolean;
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
// Interview
// ─────────────────────────────────────────────

export const interviewApi = {
  /** Start or continue a mock interview session */
  session: (payload: {
    profile_id?: number | null;
    role_title: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    messages: ChatMessage[];
  }) =>
    api
      .post<{
        reply: string;
        is_final: boolean;
        feedback?: string;
      }>("/api/interview", payload)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Resume Rewriter
// ─────────────────────────────────────────────

export const resumeRewriterApi = {
  /** Rewrite a resume bullet point for a target role */
  rewrite: (payload: {
    bullet: string;
    target_role?: string;
    profile_id?: number | null;
  }) =>
    api
      .post<{
        original: string;
        optimised: string;
        explanation: string;
      }>("/api/resume-rewriter", payload)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Compare Roles
// ─────────────────────────────────────────────

export const compareApi = {
  /** Compare multiple roles for a profile */
  compare: (payload: { profile_id: number; role_ids: number[] }) =>
    api
      .post<{
        common_skills: string[];
        roles: Array<{
          role_id: number;
          title: string;
          match_score: number;
          transition_difficulty: string;
          avg_salary: number;
          matched_skills: string[];
          missing_skills: string[];
          unique_skills: string[];
        }>;
      }>("/api/compare-roles", payload)
      .then((r) => r.data),
};

// ─────────────────────────────────────────────
// Export convenience re-export of raw axios client
// ─────────────────────────────────────────────
export { default as apiClient } from "./api-client";
