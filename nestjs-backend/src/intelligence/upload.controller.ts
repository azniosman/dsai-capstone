import { 
  Controller, 
  Post, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException,
  Request,
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IntelligenceService } from './intelligence.service';
import { ResumeParser } from '../common/utils/resume-parser.util';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('upload-resume')
export class UploadController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadResume(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // 1. Extract text from PDF/DOCX
      const text = await ResumeParser.extractText(file.buffer, file.mimetype);
      
      // 2. Parse text into structured data
      return this.intelligenceService.parseResume(text);
    } catch (error: any) {
      console.error('Resume upload/parse error:', error);
      throw new BadRequestException(`Failed to process resume: ${error.message}`);
    }
  }
}
