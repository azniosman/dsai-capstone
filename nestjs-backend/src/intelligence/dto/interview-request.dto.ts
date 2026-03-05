import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatMessage } from './intelligence.dto';

export class InterviewRequestDto {
  @IsOptional()
  @IsInt()
  profile_id?: number;

  @IsString()
  job_title!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  messages!: ChatMessage[];
}
