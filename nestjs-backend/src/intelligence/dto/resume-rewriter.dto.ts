import { IsInt, IsOptional, IsString } from 'class-validator';

export class ResumeRewriterDto {
  @IsOptional()
  @IsInt()
  profile_id?: number;

  @IsString()
  bullet!: string;

  @IsString()
  target_role!: string;
}
