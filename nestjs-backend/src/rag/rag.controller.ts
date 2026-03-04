/**
 * @file rag.controller.ts
 * @description Public RAG query endpoint — embeds the query, searches
 * pgvector, and returns relevant document chunks with similarity scores.
 *
 * POST /api/rag/query
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
import { OptionalJwtAuthGuard } from '@app/auth/guards/optional-jwt-auth.guard';
import type { OptionalAuthenticatedRequest } from '@app/intelligence/intelligence.controller';

@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  /**
   * Performs a semantic similarity search against all document chunks for the
   * current tenant and returns the top-K most relevant passages.
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
}
