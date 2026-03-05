import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesService } from './roles.service';
import { OptionalAuthenticatedRequest } from '../types/auth-request.interface';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** List all job roles. Unauthenticated callers default to the Global tenant. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async findAll(@Request() req: OptionalAuthenticatedRequest) {
    return this.rolesService.findAll(req.user?.tenant?.id ?? 1);
  }
}
