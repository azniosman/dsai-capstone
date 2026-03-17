import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatMessage {
  @IsIn(['system', 'user', 'assistant', 'tool'])
  role!: 'system' | 'user' | 'assistant' | 'tool';

  @IsOptional()
  @IsString()
  content?: string | null;

  @IsOptional()
  @IsString()
  tool_call_id?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  tool_calls?: any[];
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
