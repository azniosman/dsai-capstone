import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { DomainService } from './domain.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import {
  AuthenticatedRequest,
  OptionalAuthenticatedRequest,
} from '../types/auth-request.interface';

@Controller()
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  /** Smoke test for the Domain controller. */
  @Get('admin/test')
  smokeTest() {
    return { status: 'Domain Controller OK' };
  }

  /** Singapore labour market insights aggregated by sector. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('market-insights')
  getMarketInsights(@Request() req: OptionalAuthenticatedRequest) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.domainService.getMarketInsights(tenantId);
  }

  /** Authenticated user's dashboard KPI summary. */
  @UseGuards(JwtAuthGuard)
  @Get('dashboard/summary')
  getDashboardSummary(@Request() req: AuthenticatedRequest) {
    return this.domainService.getDashboardSummary(
      req.user.id,
      req.user.tenant.id,
    );
  }
}
