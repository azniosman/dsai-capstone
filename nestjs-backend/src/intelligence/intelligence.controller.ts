import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IntelligenceService } from './intelligence.service';
import { CopilotService } from './copilot.service';
import {
  ChatRequestDto,
  RecommendRequestDto,
  JdMatchDto,
} from './dto/intelligence.dto';
import { ResumeRewriterDto } from './dto/resume-rewriter.dto';
import { InterviewRequestDto } from './dto/interview-request.dto';
import {
  CopilotChatDto,
  ExtractProfileDto,
  CareerPlanDto,
  ResumeTipsDto,
} from './dto/copilot.dto';
import { SystemTerminalService, SystemChatDto } from './system-terminal.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { OptionalAuthenticatedRequest } from '../types/auth-request.interface';

@Throttle({ default: { ttl: 60_000, limit: 20 } })
@Controller()
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: IntelligenceService,
    private readonly copilotService: CopilotService,
    private readonly systemTerminalService: SystemTerminalService,
  ) {}

  // ─── Original Intelligence Endpoints ──────────────────────────────────────

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

  /** Rewrite a resume bullet point to be stronger and more relevant for a target role. */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('resume-rewriter')
  rewriteResume(@Body() payload: ResumeRewriterDto) {
    return this.intelligenceService.rewriteResume(
      payload.bullet,
      payload.target_role,
    );
  }

  /** Mock interview session with the AI interviewer for a given job title. */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('interview')
  async interview(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: InterviewRequestDto,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.intelligenceService.interview(payload, tenantId);
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

  // ─── System Terminal Endpoint ─────────────────────────────────────────────

  /**
   * RAG-powered Q&A over SkillBridge system documentation.
   * Scope-limited to architecture, pipeline, datasets, AWS, deployment topics.
   *
   * POST /api/system-chat
   */
  @Post('system-chat')
  async systemChat(@Body() payload: SystemChatDto) {
    return this.systemTerminalService.systemChat(payload);
  }

  // ─── Copilot Endpoints ────────────────────────────────────────────────────

  /**
   * Phase 1: Extract and persist structured career intelligence from the
   * user's stored resume text using the LLM.
   *
   * POST /copilot/extract
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('copilot/extract')
  async extractCareerProfile(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: ExtractProfileDto,
    @Query('force') force?: string,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.copilotService.extractCareerProfile(
      payload.profile_id,
      tenantId,
      force === 'true',
    );
  }

  /**
   * Phase 2: Enriched Copilot chat — injects career intelligence + RAG context
   * into every message for personalised career advice.
   *
   * POST /copilot/chat
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('copilot/chat')
  async copilotChat(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: CopilotChatDto,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.copilotService.copilotChat(
      payload.profile_id,
      payload.messages,
      tenantId,
    );
  }

  /**
   * Phase 3: Generate a full structured career analysis report for the profile.
   *
   * GET /copilot/analyze/:profileId
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('copilot/analyze/:profileId')
  async analyzeCareer(
    @Request() req: OptionalAuthenticatedRequest,
    @Param('profileId') profileId: string,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.copilotService.analyzeCareer(+profileId, tenantId);
  }

  /**
   * Phase 4: Generate a structured N-month career transition plan.
   *
   * POST /copilot/career-plan
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('copilot/career-plan')
  async careerPlan(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: CareerPlanDto,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.copilotService.generateCareerPlan(
      payload.profile_id,
      tenantId,
      payload.target_role,
      payload.months ?? 12,
    );
  }

  /**
   * Phase 5: Return targeted resume improvement tips.
   *
   * POST /copilot/resume-tips
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('copilot/resume-tips')
  async resumeTips(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: ResumeTipsDto,
  ) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.copilotService.getResumeTips(
      payload.profile_id,
      tenantId,
      payload.target_role,
    );
  }
}
