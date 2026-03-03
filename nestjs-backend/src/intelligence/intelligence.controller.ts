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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller()
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('admin/test')
  smokeTest() {
    return { status: 'Intelligence Controller OK' };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('chat')
  async chat(@Request() req: any, @Body() payload: ChatRequestDto) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.intelligenceService.chat(payload, tenantId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('recommend')
  async recommendRoles(
    @Request() req: any,
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

  @UseGuards(OptionalJwtAuthGuard)
  @Get('skill-gap/:profileId')
  async getSkillGap(
    @Request() req: any,
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

  @UseGuards(OptionalJwtAuthGuard)
  @Post('jd-match')
  async analyzeJdMatch(@Request() req: any, @Body() payload: JdMatchDto) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.intelligenceService.analyzeJdMatch(
      payload.profile_id,
      payload.job_description,
      payload.job_title,
      tenantId,
    );
  }
}
