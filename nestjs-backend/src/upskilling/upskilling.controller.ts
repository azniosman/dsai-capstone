import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { UpskillingService } from './upskilling.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoadmapDataDto } from './dto/upskilling.dto';

@UseGuards(JwtAuthGuard)
@Controller('upskilling')
export class UpskillingController {
  constructor(private readonly upskillingService: UpskillingService) {}

  @Get('admin/test')
  smokeTest() {
    return { status: 'Upskilling Controller OK' };
  }

  @Get(':profileId')
  async getUpskilling(
    @Request() req: any,
    @Param('profileId') profileId: string,
  ): Promise<RoadmapDataDto> {
    return this.upskillingService.getUpskilling(
      +profileId,
      req.user.tenant.id,
      req.user.id,
    );
  }
}
