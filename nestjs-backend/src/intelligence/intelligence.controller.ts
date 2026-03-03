import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import {
  ChatRequestDto,
  RecommendRequestDto,
  JdMatchDto,
} from './dto/intelligence.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OptionalAuthenticatedRequest } from '../types/auth-request.interface';

@Controller()
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  /**
   * Health and smoke test for the Intelligence controller.
   * @returns Controller operational status.
   */
  @Get('admin/test')
  smokeTest() {
    return { status: 'Intelligence Controller OK' };
  }

  /** Send a chat message to the career coach via the multi-LLM provider chain. */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('chat')
  async chat(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: ChatRequestDto,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.intelligenceService.chat(payload, tenantId);
  }

  /** Return ranked job role recommendations for the given profile. */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('recommend')
  async recommendRoles(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: RecommendRequestDto,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    const recommendations = await this.intelligenceService.getRecommendations(
      payload,
      tenantId,
    );
    return {
      profile_id: payload.profile_id ?? payload.profileId,
      recommendations,
    };
  }

  /** Return skill gaps between the profile and its target role. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('skill-gap/:profileId')
  async getSkillGap(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('profileId') profileId: string,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    const gaps = await this.intelligenceService.getSkillGap(
      +profileId,
      tenantId,
    );
    return {
      profile_id: +profileId,
      gaps,
    };
  }

  /** Score how well a profile matches a given job description. */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('jd-match')
  analyzeJdMatch(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: JdMatchDto,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.intelligenceService.analyzeJdMatch(
      payload.profile_id,
      payload.job_description,
      payload.job_title,
      tenantId,
    );
  }
}
