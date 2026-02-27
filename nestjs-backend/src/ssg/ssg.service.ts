import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { SCTPCourse } from '@app/entities/sctp-course.entity';
import { SsgClientService } from './ssg-client.service';
import { SsgCacheService } from './ssg-cache.service';
import {
  CourseSearchQueryDto,
  SsgCourse,
  SsgJobRole,
  SsgRecommendedCourse,
  PaginatedSsgCoursesResponse,
} from './dto/ssg.dto';

/**
 * Orchestrates SSG/WSG API calls with a three-tier fallback:
 *   1. PostgreSQL cache (fast, avoids rate limits)
 *   2. Live SSG API (if credentials configured and cache miss/expired)
 *   3. Seeded SCTPCourse rows (always available, no external dependency)
 */
@Injectable()
export class SsgService {
  private readonly logger = new Logger(SsgService.name);

  constructor(
    private readonly client: SsgClientService,
    private readonly cache: SsgCacheService,
    @InjectRepository(SCTPCourse)
    private readonly courseRepo: EntityRepository<SCTPCourse>,
  ) {}

  // ─── Courses ──────────────────────────────────────────────────

  async searchCourses(query: CourseSearchQueryDto): Promise<PaginatedSsgCoursesResponse> {
    const cacheKey = `courses:${query.keyword ?? ''}:${query.skill ?? ''}:${query.limit ?? 20}:${query.offset ?? 0}`;

    // 1. Try cache
    const cached = await this.cache.get<PaginatedSsgCoursesResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return { ...cached, source: 'cached' };
    }

    // 2. Try live SSG API
    if (this.client.isConfigured()) {
      try {
        const raw = await this.client.get<any>('/courses/courseRuns', {
          ...(query.keyword ? { keyword: query.keyword } : {}),
          pageSize: String(query.limit ?? 20),
          pageIndex: String(Math.floor((query.offset ?? 0) / (query.limit ?? 20)) + 1),
        });

        const courses = this.mapSsgCourseRuns(raw?.data ?? raw?.courseRuns ?? [], 'live');
        const result: PaginatedSsgCoursesResponse = {
          data: courses,
          total: raw?.total ?? courses.length,
          limit: query.limit ?? 20,
          offset: query.offset ?? 0,
          source: 'live',
        };

        // Store in cache (fire-and-forget)
        this.cache.set(cacheKey, result as unknown as Record<string, unknown>).catch((e) =>
          this.logger.warn(`Cache write failed: ${e.message}`),
        );

        return result;
      } catch (err: any) {
        this.logger.warn(`SSG API error, falling back to seeded data: ${err.message}`);
      }
    }

    // 3. Seeded fallback
    return this.searchSeeded(query);
  }

  async getCourseByReference(referenceNumber: string): Promise<SsgCourse | null> {
    const cacheKey = `course:${referenceNumber}`;

    const cached = await this.cache.get<SsgCourse>(cacheKey);
    if (cached) return { ...cached, source: 'cached' };

    if (this.client.isConfigured()) {
      try {
        const raw = await this.client.get<any>(
          `/courses/courseRuns/${encodeURIComponent(referenceNumber)}`,
        );
        const course = this.mapSingleCourseRun(raw, 'live');

        this.cache.set(cacheKey, course as unknown as Record<string, unknown>).catch(() => {});
        return course;
      } catch (err: any) {
        this.logger.warn(`SSG API error for course ${referenceNumber}: ${err.message}`);
      }
    }

    // Fall back to seeded
    const seeded = await this.courseRepo.findOne({
      url: { $like: `%${referenceNumber}%` },
    });
    if (seeded) return this.mapSeededCourse(seeded, 'seeded');
    return null;
  }

  // ─── Job Roles ────────────────────────────────────────────────

  async getJobRoles(sector?: string): Promise<SsgJobRole[]> {
    const cacheKey = `jobroles:${sector ?? 'all'}`;

    const cached = await this.cache.get<SsgJobRole[]>(cacheKey);
    if (cached) return cached;

    if (this.client.isConfigured()) {
      try {
        const raw = await this.client.get<any>('/skillsframework/jobRoles', {
          ...(sector ? { sector } : {}),
        });
        const roles: SsgJobRole[] = (raw?.data ?? raw ?? []).map((r: any) => ({
          jobRoleCode: r.jobRoleCode ?? r.code ?? '',
          jobRoleTitle: r.jobRoleTitle ?? r.title ?? '',
          jobRoleDescription: r.description ?? r.jobRoleDescription,
          sector: r.sector,
          tsc: r.technicalSkillsAndCompetencies ?? r.tsc,
        }));

        this.cache.set(cacheKey, roles as unknown as Record<string, unknown>).catch(() => {});
        return roles;
      } catch (err: any) {
        this.logger.warn(`SSG job roles API error: ${err.message}`);
      }
    }

    return [];
  }

  // ─── Recommendations ──────────────────────────────────────────

  async getRecommendations(
    skills: string[],
    targetRole?: string,
  ): Promise<SsgRecommendedCourse[]> {
    const keyword = targetRole ?? (skills[0] ?? '');
    const result = await this.searchCourses({ keyword, limit: 50, offset: 0 });

    // Score each course by skill overlap
    return result.data
      .map((course) => {
        const courseTags = [
          ...(course.skillsFrameworkSkillCodes ?? []),
          course.title,
          course.provider,
        ]
          .join(' ')
          .toLowerCase();

        const matched = skills.filter((s) => courseTags.includes(s.toLowerCase()));
        const relevanceScore = matched.length / Math.max(skills.length, 1);

        return { ...course, matchedSkills: matched, relevanceScore };
      })
      .filter((c) => c.relevanceScore > 0 || result.source === 'seeded')
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);
  }

  // ─── Seeded fallback helpers ──────────────────────────────────

  private async searchSeeded(query: CourseSearchQueryDto): Promise<PaginatedSsgCoursesResponse> {
    const all = await this.courseRepo.findAll();

    const keyword = (query.keyword ?? '').toLowerCase();
    const skill = (query.skill ?? '').toLowerCase();

    const filtered = all.filter((c) => {
      if (keyword && !c.title.toLowerCase().includes(keyword) && !c.provider.toLowerCase().includes(keyword)) {
        return false;
      }
      if (skill && !c.skillsTaught.some((s) => s.toLowerCase().includes(skill))) {
        return false;
      }
      return true;
    });

    const offset = query.offset ?? 0;
    const limit = query.limit ?? 20;
    const page = filtered.slice(offset, offset + limit);

    return {
      data: page.map((c) => this.mapSeededCourse(c, 'seeded')),
      total: filtered.length,
      limit,
      offset,
      source: 'seeded',
    };
  }

  // ─── Data mappers ─────────────────────────────────────────────

  private mapSsgCourseRuns(runs: any[], source: 'live' | 'cached'): SsgCourse[] {
    return runs.map((r) => this.mapSingleCourseRun(r, source));
  }

  private mapSingleCourseRun(r: any, source: 'live' | 'cached'): SsgCourse {
    const run = r?.courseRun ?? r?.run ?? r;
    const course = r?.course ?? r;

    return {
      referenceNumber:
        run?.courseRunId ??
        course?.courseReferenceNumber ??
        r?.referenceNumber ??
        '',
      title: course?.title ?? r?.courseTitle ?? r?.title ?? 'Untitled',
      provider:
        course?.trainingPartner?.name ??
        course?.trainingProvider?.name ??
        r?.trainingPartnerName ??
        'Unknown Provider',
      totalCostOfTrainingPerTrainee:
        run?.courseFee?.totalCostOfTrainingPerTrainee ??
        r?.totalCostOfTrainingPerTrainee,
      subsidisedFee:
        run?.courseFee?.subsidisedFeeAmount ?? r?.subsidisedFee,
      skillsFrameworkSkillCodes:
        course?.skillsFramework?.map((s: any) => s.skillCode ?? s) ?? [],
      objectives: course?.objective ?? r?.objectives,
      modeOfTraining:
        run?.modeOfTraining?.description ??
        run?.modeOfTraining ??
        r?.modeOfTraining,
      totalTrainingDurationHour:
        run?.courseDuration?.value ??
        course?.totalTrainingDurationHour ??
        r?.totalTrainingDurationHour,
      registrationClosingDate:
        run?.registrationDates?.closing ?? r?.registrationClosingDate,
      courseAdminEmail: run?.adminEmail ?? r?.adminEmail,
      url: r?.url ?? r?.courseUrl,
      source,
    };
  }

  private mapSeededCourse(c: SCTPCourse, source: 'seeded'): SsgCourse {
    return {
      referenceNumber: `SEED-${c.id}`,
      title: c.title,
      provider: c.provider,
      totalCostOfTrainingPerTrainee: c.courseFee,
      subsidisedFee: c.nettFeeAfterSubsidy,
      skillsFrameworkSkillCodes: c.skillsTaught,
      objectives: undefined,
      modeOfTraining: undefined,
      totalTrainingDurationHour: c.durationWeeks ? c.durationWeeks * 40 : undefined,
      url: c.url,
      source,
    };
  }
}
