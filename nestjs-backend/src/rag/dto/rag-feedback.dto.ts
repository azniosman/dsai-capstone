import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RagFeedbackDto {
  /** ID of the DocumentChunk the user reacted to. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  chunk_id!: number;

  /** The query that produced this chunk (used for future re-ranking). */
  @IsString()
  @IsNotEmpty()
  query_text!: string;

  /** `true` = thumbs-up, `false` = thumbs-down. */
  @IsBoolean()
  is_positive!: boolean;

  /** Caller may provide their profile_id explicitly (unauthenticated flows). */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  profile_id?: number;
}
