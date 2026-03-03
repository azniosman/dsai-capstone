/**
 * @file upload.controller.ts
 * @description Handles resume file uploads — accepts PDF/DOCX and returns
 * structured profile data via the LLM-powered resume parser.
 */

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IntelligenceService } from './intelligence.service';
import { ResumeParser } from '../common/utils/resume-parser.util';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('upload-resume')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      const text = await ResumeParser.extractText(file.buffer, file.mimetype);
      return this.intelligenceService.parseResume(text);
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(
        'Resume upload/parse error',
        error?.stack ?? error?.message,
      );
      throw new BadRequestException(
        `Failed to process resume: ${error.message}`,
      );
    }
  }
}
