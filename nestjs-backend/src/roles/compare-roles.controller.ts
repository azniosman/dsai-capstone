import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CompareRolesDto } from './dto/compare-roles.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('compare-roles')
export class CompareRolesController {
  constructor(private readonly rolesService: RolesService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  compare(@Request() req: any, @Body() dto: CompareRolesDto) {
    const tenantId = req.user ? req.user.tenant.id : 1;
    return this.rolesService.compareRoles(dto.profile_id, dto.role_ids, tenantId);
  }
}
