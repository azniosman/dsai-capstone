import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CoursesService } from './courses.service';
import { OptionalAuthenticatedRequest } from '../types/auth-request.interface';
import { SubsidyRequestDto } from '../domain/dto/domain.dto';

@Controller()
@UseGuards(OptionalJwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /** List all SCTP courses. Unauthenticated callers default to the Global tenant. */
  @Get('courses')
  async findAll(@Request() req: OptionalAuthenticatedRequest) {
    return this.coursesService.findAll(req.user?.tenant?.id ?? 1);
  }

  /** Calculate SkillsFuture subsidy. Unauthenticated callers default to the Global tenant. */
  @Post('calculate-subsidy')
  async calculateSubsidy(
    @Request() req: OptionalAuthenticatedRequest,
    @Body() payload: SubsidyRequestDto,
  ) {
    return this.coursesService.calculateSubsidy(
      payload,
      req.user?.tenant?.id ?? 1,
    );
  }
}
