import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class RagQueryDto {
  @IsString()
  @IsNotEmpty()
  query!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  profile_id?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  top_k?: number = 3;

  @IsOptional()
  @Type(() => Number)
  threshold?: number = 0.5;
}
