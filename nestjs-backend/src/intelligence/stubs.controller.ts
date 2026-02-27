import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { NotImplementedException } from '@nestjs/common';

@Controller()
export class StubsController {
  @Get('export/roadmap/:id')
  exportRoadmap() {
    throw new NotImplementedException(
      'GET /api/export/roadmap/:id is not yet implemented',
    );
  }

  @Post('rag/query')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  ragQuery() {
    throw new NotImplementedException(
      'POST /api/rag/query is not yet implemented',
    );
  }

  @Post('voice')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  voiceCoach() {
    throw new NotImplementedException('POST /api/voice is not yet implemented');
  }
}
