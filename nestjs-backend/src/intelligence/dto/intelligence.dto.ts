import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessage {
  @IsString()
  role!: string;

  @IsString()
  content!: string;
}

export class ChatRequestDto {
  @IsOptional()
  @IsInt()
  profileId?: number;

  @IsOptional()
  @IsInt()
  profile_id?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  messages!: ChatMessage[];
}

export class RecommendRequestDto {
  @IsOptional()
  @IsInt()
  profileId?: number;

  @IsOptional()
  @IsInt()
  profile_id?: number;
}

export class JdMatchDto {
  @IsInt()
  profile_id!: number;

  @IsString()
  job_description!: string;

  @IsOptional()
  @IsString()
  job_title?: string;
}

