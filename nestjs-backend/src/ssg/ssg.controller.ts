import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { SsgService } from './ssg.service';
import {
  CourseSearchQueryDto,
  SsgRecommendationsRequestDto,
} from './dto/ssg.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('ssg')
export class SsgController {
  constructor(private readonly ssgService: SsgService) {}

  /**
   * Search SkillsFuture / SSG courses.
   * Falls back to seeded database when SSG credentials are not configured.
   *
   * GET /api/ssg/courses/search?keyword=python&skill=SQL&limit=20&offset=0
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('courses/search')
  async searchCourses(@Query() query: CourseSearchQueryDto) {
    return this.ssgService.searchCourses(query);
  }

  /**
   * Get a single course by SSG course reference number.
   *
   * GET /api/ssg/courses/:referenceNumber
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('courses/:referenceNumber')
  async getCourse(@Param('referenceNumber') referenceNumber: string) {
    const course = await this.ssgService.getCourseByReference(referenceNumber);
    if (!course) {
      throw new NotFoundException(`Course "${referenceNumber}" not found`);
    }
    return course;
  }

  /**
   * Get SkillsFramework job roles from WSG.
   *
   * GET /api/ssg/job-roles?sector=FinTech
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('job-roles')
  async getJobRoles(@Query('sector') sector?: string) {
    return this.ssgService.getJobRoles(sector);
  }

  /**
   * Get personalised SSG course recommendations based on skills.
   * Scores courses by skill overlap and returns top 10.
   *
   * POST /api/ssg/recommendations
   * Body: { skills: string[], targetRole?: string, profileId?: number }
   */
  @UseGuards(OptionalJwtAuthGuard)
  @Post('recommendations')
  async getRecommendations(
    @Body() body: SsgRecommendationsRequestDto,
    @Request() req: any,
  ) {
    const courses = await this.ssgService.getRecommendations(
      body.skills,
      body.targetRole,
    );
    return {
      profileId: body.profileId ?? req.user?.profile?.id ?? null,
      targetRole: body.targetRole ?? null,
      courses,
    };
  }
}
