/**
 * @file upload.controller.ts
 * @description Handles resume file uploads — accepts PDF/DOCX and returns
 * structured profile data via the LLM-powered resume parser.
 */

import {
  Body,
  Controller,
  Post,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IntelligenceService } from './intelligence.service';
import { ResumeParser } from '../common/utils/resume-parser.util';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RagService } from '../rag/rag.service';
import type { OptionalAuthenticatedRequest } from './intelligence.controller';

class UploadResumeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  profile_id?: number;
}

@Controller('upload-resume')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly intelligenceService: IntelligenceService,
    private readonly ragService: RagService,
  ) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadResumeDto,
    @Request() req: OptionalAuthenticatedRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    let text: string;
    try {
      text = await ResumeParser.extractText(file.buffer, file.mimetype);
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error('Resume text extraction failed', error?.stack ?? error?.message);
      throw new BadRequestException(`Failed to process resume: ${error.message}`);
    }

    // Parse resume (primary response — always awaited)
    const parsed = await this.intelligenceService.parseResume(text);

    // Store chunks for RAG (best-effort, non-blocking on failure)
    const profileId = dto.profile_id ?? null;
    const tenantId = req.user ? req.user.tenant.id : 1;
    this.ragService
      .storeChunks(text, profileId, 'resume', tenantId)
      .catch((err: Error) =>
        this.logger.warn(`RAG chunk storage failed: ${err.message}`),
      );

    return parsed;
  }
}
