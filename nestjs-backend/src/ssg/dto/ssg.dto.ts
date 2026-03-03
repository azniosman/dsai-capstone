import {
  IsOptional,
  IsString,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Request DTOs ──────────────────────────────────────────────

export class CourseSearchQueryDto {
  @IsString()
  @IsOptional()
  keyword?: string;

  @IsString()
  @IsOptional()
  skill?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number = 0;
}

export class SsgRecommendationsRequestDto {
  @IsArray()
  @IsString({ each: true })
  skills!: string[];

  @IsString()
  @IsOptional()
  targetRole?: string;

  @IsInt()
  @IsOptional()
  profileId?: number;
}

// ─── Response types (shape of data returned to frontend) ──────

export interface SsgCourseSession {
  sessionId?: string;
  startDate?: string;
  endDate?: string;
  modeOfTraining?: string;
  venue?: {
    building?: string;
    postalCode?: string;
  };
  scheduleInfoType?: string;
}

export interface SsgCourse {
  referenceNumber: string;
  title: string;
  provider: string;
  totalCostOfTrainingPerTrainee?: number;
  totalCostOfTrainingPerTraineeAmount?: number;
  subsidisedFee?: number;
  skillsFrameworkSkillCodes?: string[];
  objectives?: string;
  modeOfTraining?: string;
  totalTrainingDurationHour?: number;
  registrationClosingDate?: string;
  courseAdminEmail?: string;
  url?: string;
  // Enriched fields (added by SsgService)
  source: 'live' | 'cached' | 'seeded';
  matchedSkills?: string[];
}

export interface PaginatedSsgCoursesResponse {
  data: SsgCourse[];
  total: number;
  limit: number;
  offset: number;
  source: 'live' | 'cached' | 'seeded';
}

export interface SsgJobRole {
  jobRoleCode: string;
  jobRoleTitle: string;
  jobRoleDescription?: string;
  sector?: string;
  tsc?: Array<{
    tscTitle: string;
    tscCode: string;
    proficiencyLevel?: string;
  }>;
}

export interface SsgRecommendedCourse extends SsgCourse {
  relevanceScore: number;
}
