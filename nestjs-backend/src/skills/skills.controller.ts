import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateProgressDto, UpdateProgressLevelDto } from './dto/progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../types/auth-request.interface';

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  /**
   * Logs a new upskilling progress event block tracked to the user profile.
   *
   * @param req The valid verified executing auth identity.
   * @param payload Contains standard progress entry definitions (`currentLevel`).
   * @returns Echo of the created progress entry element.
   */
  @Post()
  recordProgress(
    @Request() req: AuthenticatedRequest,
    @Body() payload: CreateProgressDto,
  ) {
    return this.skillsService.recordProgress(
      payload,
      req.user.tenant.id,
      req.user.id,
    );
  }

  /**
   * Extracts cumulative skill levels for a defined user profile bounded by tenant.
   *
   * @param req Resolves identity checking ownership boundaries.
   * @param profileId Explicit targeted parameter block query integer mapping.
   * @returns Comprehensive hierarchical dictionary of recorded tracked metrics.
   */
  @Get(':profileId')
  getProgress(
    @Request() req: AuthenticatedRequest,
    @Param('profileId') profileId: string,
  ) {
    return this.skillsService.getProgress(
      +profileId,
      req.user.tenant.id,
      req.user.id,
    );
  }

  /**
   * Retrieves an ordered series of level up progression interactions.
   *
   * @param req Identification signature context payload.
   * @param profileId Profile integer.
   * @returns Historical temporal ordered array of progression stages.
   */
  @Get(':profileId/timeline')
  getProgressTimeline(
    @Request() req: AuthenticatedRequest,
    @Param('profileId') profileId: string,
  ) {
    return this.skillsService.getProgressTimeline(
      +profileId,
      req.user.tenant.id,
      req.user.id,
    );
  }

  /**
   * Benchmarks a single individual against their entire local organizational Tenant.
   *
   * @param req Tenant context payload checking.
   * @param profileId Profile relational tracking map ID reference constraint.
   * @returns Averaged scoring delta structure comparison matrix points.
   */
  @Get('peer-comparison/:profileId')
  getPeerComparison(
    @Request() req: AuthenticatedRequest,
    @Param('profileId') profileId: string,
  ) {
    return this.skillsService.getPeerComparison(+profileId, req.user.tenant.id);
  }

  /**
   * Fixes or overwrites an existing upskilling progress event entry locally.
   *
   * @param req Ownership checking context container.
   * @param entryId Progress entry ID.
   * @param payload Granular modifications schema allowed payload validation structure.
   * @returns Transacted update echo properties mapping.
   */
  @Patch(':entryId')
  updateProgressEntry(
    @Request() req: AuthenticatedRequest,
    @Param('entryId') entryId: string,
    @Body() payload: UpdateProgressLevelDto,
  ) {
    return this.skillsService.updateProgress(
      +entryId,
      payload,
      req.user.tenant.id,
      req.user.id,
    );
  }

  /**
   * Safely deletes tracking block objects preventing downstream computation skew.
   *
   * @param req Tenant checking logic context verification boundaries.
   * @param entryId Event level integer mapping reference constraint target target target.
   */
  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProgressEntry(
    @Request() req: AuthenticatedRequest,
    @Param('entryId') entryId: string,
  ) {
    return this.skillsService.deleteProgress(
      +entryId,
      req.user.tenant.id,
      req.user.id,
    );
  }
}
