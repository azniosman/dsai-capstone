import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateProgressDto, UpdateProgressLevelDto } from './dto/progress.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get('admin/test')
  smokeTest() {
    return { status: 'Skills Controller OK' };
  }

  @Post()
  recordProgress(@Request() req: any, @Body() payload: CreateProgressDto) {
    return this.skillsService.recordProgress(payload, req.user.tenant.id, req.user.id);
  }

  @Get(':profileId')
  getProgress(@Request() req: any, @Param('profileId') profileId: string) {
    return this.skillsService.getProgress(+profileId, req.user.tenant.id, req.user.id);
  }

  @Get(':profileId/timeline')
  getProgressTimeline(@Request() req: any, @Param('profileId') profileId: string) {
    return this.skillsService.getProgressTimeline(+profileId, req.user.tenant.id, req.user.id);
  }

  @Get('peer-comparison/:profileId')
  getPeerComparison(@Request() req: any, @Param('profileId') profileId: string) {
    return this.skillsService.getPeerComparison(+profileId, req.user.tenant.id);
  }

  @Patch(':entryId')
  updateProgressEntry(
    @Request() req: any,
    @Param('entryId') entryId: string,
    @Body() payload: UpdateProgressLevelDto,
  ) {
    return this.skillsService.updateProgress(+entryId, payload, req.user.tenant.id, req.user.id);
  }

  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteProgressEntry(@Request() req: any, @Param('entryId') entryId: string) {
    return this.skillsService.deleteProgress(+entryId, req.user.tenant.id, req.user.id);
  }
}
