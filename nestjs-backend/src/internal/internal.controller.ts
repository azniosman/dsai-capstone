import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InternalTokenGuard } from '@app/common/guards/internal-token.guard';
import { SsgService } from '../ssg/ssg.service';
import { SsgCacheService } from '../ssg/ssg-cache.service';
import { IntelligenceService } from '../intelligence/intelligence.service';
import { DomainService } from '../domain/domain.service';

/** Response shape for cache sync operations. */
interface SyncResult {
  synced: number;
  errors: number;
  duration_ms: number;
  source: string;
}

/** Response shape for cleanup operations. */
interface CleanupResult {
  deleted: number;
  duration_ms: number;
}

/** Response shape for batch pre-computation operations. */
interface BatchResult {
  profiles_processed: number;
  errors: number;
  duration_ms: number;
}

/**
 * Controller that exposes internal automation endpoints.
 *
 * All routes on this controller are prefixed with `/internal` and guarded
 * by {@link InternalTokenGuard} (except `/health`). They are invoked
 * **exclusively** via the AWS Lambda Invoke API from the automation Lambda
 * layer and are never registered on a public API Gateway route.
 *
 * Design: every endpoint measures its own execution time and returns
 * a structured result so automation Lambdas can emit CloudWatch metrics
 * without any additional logic.
 */
@Controller('internal')
export class InternalController {
  constructor(
    private readonly ssgService: SsgService,
    private readonly ssgCacheService: SsgCacheService,
    private readonly intelligenceService: IntelligenceService,
    private readonly domainService: DomainService,
  ) {}

  // ─── Health ────────────────────────────────────────────────────────────────

  /**
   * Lightweight health check used by the Lambda warm-up scheduler.
   * No authentication required — the endpoint must respond even if the
   * automation token is not configured.
   *
   * GET /internal/health
   */
  @Get('health')
  @HttpCode(HttpStatus.OK)
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // ─── SSG Sync ──────────────────────────────────────────────────────────────

  /**
   * Proactively populates `ssg_cache` with SSG/WSG course data.
   * Triggered nightly by EventBridge (cron 01:00 UTC).
   *
   * POST /internal/sync/ssg/courses
   */
  @Post('sync/ssg/courses')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  async syncSsgCourses(): Promise<SyncResult> {
    const start = Date.now();
    let synced = 0;
    let errors = 0;

    // Common search keywords seeded from SkillsFuture data catalogue
    const keywords = [
      'python',
      'data analytics',
      'cloud',
      'cybersecurity',
      'machine learning',
      'react',
      'typescript',
      'project management',
      'artificial intelligence',
      'sql',
    ];

    for (const keyword of keywords) {
      try {
        const result = await this.ssgService.searchCourses({
          keyword,
          limit: 50,
          offset: 0,
        });
        synced += result.data.length;
      } catch {
        errors++;
      }
    }

    return {
      synced,
      errors,
      duration_ms: Date.now() - start,
      source: 'ssg_api',
    };
  }

  /**
   * Proactively caches SSG Skills Framework job roles.
   * Triggered nightly by EventBridge (cron 01:30 UTC).
   *
   * POST /internal/sync/ssg/jobroles
   */
  @Post('sync/ssg/jobroles')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  async syncSsgJobRoles(): Promise<SyncResult> {
    const start = Date.now();
    let synced = 0;
    let errors = 0;

    const sectors = [
      'FinTech',
      'ICT',
      'Retail',
      'Healthcare',
      'Manufacturing',
      undefined, // fetch all
    ];

    for (const sector of sectors) {
      try {
        const roles = await this.ssgService.getJobRoles(sector);
        synced += roles.length;
      } catch {
        errors++;
      }
    }

    return {
      synced,
      errors,
      duration_ms: Date.now() - start,
      source: 'ssg_api',
    };
  }

  // ─── Cache Cleanup ─────────────────────────────────────────────────────────

  /**
   * Bulk-deletes all expired `ssg_cache` rows in one SQL statement.
   * Replaces the lazy per-row deletion pattern.
   * Triggered nightly by EventBridge (cron 03:00 UTC).
   *
   * POST /internal/cache/cleanup
   */
  @Post('cache/cleanup')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  async cleanupCache(): Promise<CleanupResult> {
    const start = Date.now();
    const deleted = await this.ssgCacheService.purgeExpired();
    return { deleted, duration_ms: Date.now() - start };
  }

  // ─── Recommendations ───────────────────────────────────────────────────────

  /**
   * Pre-computes recommendation scores for all active profiles.
   * Triggered nightly by EventBridge (cron 02:00 UTC).
   * Phase 2 implementation — returns a feature-not-yet-implemented stub
   * during Phase 1. Full implementation is in AUTOMATION_TASK_LIST task #5.
   *
   * POST /internal/recommendations/precompute
   */
  @Post('recommendations/precompute')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  precomputeRecommendations(
    @Body() body: { batch_size?: number },
  ): { scheduled: boolean; batch_size: number; message: string } {
    // Phase 2: Full implementation will iterate UserProfile repository,
    // score each against all JobRole entities, and write to profile_snapshot.
    return {
      scheduled: true,
      batch_size: body?.batch_size ?? 50,
      message: 'Recommendation precompute scheduled. Full implementation in Phase 2.',
    };
  }

  /**
   * Pre-generates Gemini LLM rationale for top-3 role matches per profile.
   * Triggered nightly by EventBridge (cron 02:30 UTC, after precompute).
   * Phase 2 stub.
   *
   * POST /internal/recommendations/rationale-pregen
   */
  @Post('recommendations/rationale-pregen')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  pregenRationale(): { scheduled: boolean; message: string } {
    return {
      scheduled: true,
      message: 'Rationale pre-generation scheduled. Full implementation in Phase 2.',
    };
  }

  // ─── Embeddings ────────────────────────────────────────────────────────────

  /**
   * Generates Titan embeddings for profiles without vector representations.
   * Triggered every 6 hours by EventBridge.
   * Phase 2 stub.
   *
   * POST /internal/embeddings/backfill
   */
  @Post('embeddings/backfill')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  backfillEmbeddings(
    @Body() body: { limit?: number },
  ): { scheduled: boolean; limit: number; message: string } {
    return {
      scheduled: true,
      limit: body?.limit ?? 100,
      message: 'Embedding backfill scheduled. Full implementation in Phase 2.',
    };
  }

  // ─── Analytics ─────────────────────────────────────────────────────────────

  /**
   * Pre-computes market insight metrics and caches the result.
   * Triggered nightly by EventBridge (cron 04:00 UTC).
   * Wraps the existing DomainService.getMarketInsights() and stores result.
   *
   * POST /internal/analytics/aggregate
   */
  @Post('analytics/aggregate')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  async aggregateMarketInsights(): Promise<{
    tenants_processed: number;
    duration_ms: number;
  }> {
    const start = Date.now();
    // Tenant IDs 1..3 cover the demo tenants. In Phase 2 this will read
    // all tenants from the Tenant entity repository.
    const tenantIds = [1, 2, 3];
    let processed = 0;

    for (const tenantId of tenantIds) {
      try {
        await this.domainService.getMarketInsights(tenantId);
        processed++;
      } catch {
        // Tenant may not exist — non-fatal
      }
    }

    return {
      tenants_processed: processed,
      duration_ms: Date.now() - start,
    };
  }
}
