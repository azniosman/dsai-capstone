import {
  IsString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CourseQueryDto {
  @IsOptional() @IsString() skill?: string;
  @IsOptional() @IsString() provider?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsBoolean() mcesEligible?: boolean;
}

export class SubsidyRequestDto {
  @IsInt() course_id!: number;
  @IsOptional() @IsBoolean() is_career_switcher?: boolean;
}

export class PathwayRequestDto {
  @IsArray()
  @IsString({ each: true })
  skills_needed!: string[];
}
