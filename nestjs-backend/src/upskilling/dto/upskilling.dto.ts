export interface RoadmapItem {
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
}

export interface RoadmapDataDto {
  total_weeks: number;
  total_cost: number;
  total_after_subsidy: number;
  total_skillsfuture_applicable: number;
  narrative?: string;
  roadmap: RoadmapItem[];
}
