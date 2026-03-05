import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InternalTokenGuard } from '@app/common/guards/internal-token.guard';
import { SsgService } from '../ssg/ssg.service';
import { SsgCacheService } from '../ssg/ssg-cache.service';
import { DomainService } from '../domain/domain.service';
import { RagService } from '../rag/rag.service';
import { IntelligenceService } from '../intelligence/intelligence.service';

class BackfillDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  @Type(() => Number)
  limit?: number = 100;
}

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
  private readonly logger = new Logger(InternalController.name);

  constructor(
    private readonly ssgService: SsgService,
    private readonly ssgCacheService: SsgCacheService,
    private readonly domainService: DomainService,
    private readonly ragService: RagService,
    private readonly intelligenceService: IntelligenceService,
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

  // ─── Embedding Backfill ────────────────────────────────────────────────────

  /**
   * Re-embeds `document_chunk` rows that have a NULL embedding.
   * Triggered every 6 hours by EventBridge (rate 6 hours).
   *
   * POST /internal/embeddings/backfill
   */
  @Post('embeddings/backfill')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  async backfillEmbeddings(
    @Body() dto: BackfillDto,
  ): Promise<{ processed: number; errors: number; duration_ms: number }> {
    const start = Date.now();
    const result = await this.ragService.backfill(dto.limit ?? 100);
    return { ...result, duration_ms: Date.now() - start };
  }

  // ─── Recommendation Pre-computation ────────────────────────────────────────

  /**
   * Pre-computes recommendation scores for all profiles.
   * Triggered nightly by EventBridge (cron 02:00 UTC).
   *
   * POST /internal/recommendations/precompute
   */
  @Post('recommendations/precompute')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  precomputeRecommendations(): { processed: number; duration_ms: number } {
    const start = Date.now();
    // TODO Phase 2: enumerate all UserProfile IDs and call
    // intelligenceService.getRecommendations() for each, caching results.
    this.logger.log('recommendations/precompute triggered — Phase 2 stub');
    return { processed: 0, duration_ms: Date.now() - start };
  }

  /**
   * Pre-generates LLM rationale strings for top recommendations.
   * Triggered nightly by EventBridge (cron 02:30 UTC).
   *
   * POST /internal/recommendations/rationale-pregen
   */
  @Post('recommendations/rationale-pregen')
  @UseGuards(InternalTokenGuard)
  @HttpCode(HttpStatus.OK)
  prergenRationale(): { scheduled: boolean } {
    // TODO Phase 2: call intelligenceService.getRecommendations() for cached
    // profiles and persist LLM rationale strings to avoid cold-path LLM calls.
    this.logger.log(
      'recommendations/rationale-pregen triggered — Phase 2 stub',
    );
    return { scheduled: true };
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
