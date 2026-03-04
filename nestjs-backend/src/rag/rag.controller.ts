/**
 * @file rag.controller.ts
 * @description Public RAG endpoints.
 *
 * POST /api/rag/query    — hybrid semantic + keyword search (Phase 4)
 * POST /api/rag/feedback — thumbs-up / thumbs-down signal storage (Phase 4)
 */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RagService } from './rag.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagFeedbackDto } from './dto/rag-feedback.dto';
import { OptionalJwtAuthGuard } from '@app/auth/guards/optional-jwt-auth.guard';
import type { OptionalAuthenticatedRequest } from '@app/types/auth-request.interface';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * Hybrid semantic + keyword search (Reciprocal Rank Fusion) against all
   * document chunks for the current tenant.
   *
   * POST /api/rag/query
   */
  @Post('query')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async ragQuery(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() dto: RagQueryDto,
  ): Promise<{
    query: string;
    chunks: Array<{
      id: number;
      content: string;
      sourceType: string;
      chunkIndex: number;
      similarity: number;
    }>;
    total: number;
  }> {
    const tenantId = req.user ? req.user.tenant.id : 1;

    const chunks = await this.ragService.query(dto.query, tenantId, {
      topK: dto.top_k,
      threshold: dto.threshold,
      profileId: dto.profile_id,
    });

    return {
      query: dto.query,
      chunks,
      total: chunks.length,
    };
  }

  /**
   * Records a thumbs-up or thumbs-down signal for a retrieved chunk.
   * Signals are stored for future re-ranking (Phase 5).
   *
   * POST /api/rag/feedback
   */
  @Post('feedback')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async ragFeedback(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() dto: RagFeedbackDto,
  ): Promise<{ recorded: boolean }> {
    const profileId = dto.profile_id ?? null;

    await this.ragService.recordFeedback(
      dto.chunk_id,
      dto.query_text,
      dto.is_positive,
      profileId,
    );

    return { recorded: true };
  }
}
