import { IsString, IsInt, IsOptional, IsBoolean, IsArray, Min } from 'class-validator';

export class CreateProfileDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  education?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  yearsExperience?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  years_experience?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  age?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @IsString()
  @IsOptional()
  resumeText?: string;

  @IsString()
  @IsOptional()
  resume_text?: string;

  @IsBoolean()
  @IsOptional()
  isCareerSwitcher?: boolean;

  @IsBoolean()
  @IsOptional()
  is_career_switcher?: boolean;
}
