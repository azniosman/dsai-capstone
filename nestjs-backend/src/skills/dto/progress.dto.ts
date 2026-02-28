import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsOptional,
} from 'class-validator';

export class CreateProgressDto {
  @IsOptional()
  @IsInt()
  profileId?: number;

  @IsOptional()
  @IsInt()
  profile_id?: number;

  @IsString()
  skill!: string;

  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  level!: number;
}

export class UpdateProgressLevelDto {
  @IsNumber()
  @Min(0.0)
  @Max(1.0)
  level!: number;
}
