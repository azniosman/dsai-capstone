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

export interface Recommendation {
  role_id: number;
  title: string;
  category: string;
  salary_range?: string;
  match_score: number;
  content_score: number;
  rule_score: number;
  skill_match_quality: string;
  career_switcher_bonus: number;
  matched_skills: string[];
  missing_skills: string[];
  rationale: string;
}

export interface ProgressEntry {
  id?: number;
  skill: string;
  level: number;
  recorded_at: string;
}

export interface ProgressData {
  skills_acquired: number;
  skills_in_progress: number;
  skills_total: number;
  entries: ProgressEntry[];
}

export interface TimelinePoint {
  date: string;
  skill: string;
  level: number;
}

export interface GapItem {
  skill: string;
  user_level: number;
  required_level: string;
  user_level_label: string;
  gap_severity: string;
  priority: string;
}

export interface RoleGap {
  role_title: string;
  match_score: number;
  gaps: GapItem[];
}

export interface RoadmapData {
  total_weeks: number;
  total_cost: number;
  total_after_subsidy: number;
  total_skillsfuture_applicable: number;
  narrative?: string;
  roadmap: Array<{
    week_start: number;
    week_end: number;
    course_title: string;
    provider: string;
    duration_weeks: number;
    level: string;
    skill: string;
    certification?: string;
    skillsfuture_eligible?: boolean;
    skillsfuture_credit_amount?: number;
    course_fee: number;
    nett_fee_after_subsidy: number;
    url?: string;
  }>;
}

export interface Insight {
  role_category: string;
  demand_level: string;
  avg_salary_sgd: number;
  yoy_growth_pct: number;
  hiring_volume: number;
  trending_skills: string[];
  forecast_2026?: string;
  outlook?: string;
}

export interface MarketData {
  top_skills_overall: string[];
  highest_demand_sectors: string[];
  insights: Insight[];
  last_updated?: string;
}
