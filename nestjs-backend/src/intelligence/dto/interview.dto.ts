import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InterviewRequestDto {
  @IsOptional()
  @IsInt()
  profile_id?: number;

  @IsNotEmpty()
  @IsString()
  role_title!: string;

  @IsArray()
  messages!: any[];

  @IsString()
  difficulty!: string;
}
