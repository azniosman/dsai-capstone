import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CoursesService } from './courses.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get('courses')
  async findAll(@Request() req: any) {
    return this.coursesService.findAll(req.user.tenant.id);
  }

  @Post('calculate-subsidy')
  async calculateSubsidy(@Request() req: any, @Body() payload: any) {
    return this.coursesService.calculateSubsidy(payload, req.user.tenant.id);
  }
}
