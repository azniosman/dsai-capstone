import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { DomainService } from './domain.service';
import { CourseQueryDto, SubsidyRequestDto, PathwayRequestDto } from './dto/domain.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller()
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Get('admin/test')
  smokeTest() {
    return { status: 'Domain Controller OK' };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('courses')
  getCourses(@Request() req: any, @Query() query: CourseQueryDto) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.domainService.getCourses(query, tenantId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('calculate-subsidy')
  calculateSubsidy(@Request() req: any, @Body() payload: SubsidyRequestDto) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.domainService.calculateCourseSubsidy(payload, tenantId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('market-insights')
  getMarketInsights(@Request() req: any) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.domainService.getMarketInsights(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard/summary')
  getDashboardSummary(@Request() req: any) {
    return this.domainService.getDashboardSummary(req.user.id, req.user.tenant.id);
  }
}
