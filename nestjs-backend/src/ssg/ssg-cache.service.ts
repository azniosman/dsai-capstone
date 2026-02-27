import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import { SsgCache } from '@app/entities/ssg-cache.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SsgCacheService implements OnModuleInit {
  private readonly logger = new Logger(SsgCacheService.name);
  private readonly ttlSeconds: number;

  constructor(
    @InjectRepository(SsgCache)
    private readonly cacheRepo: EntityRepository<SsgCache>,
    private readonly em: EntityManager,
    private readonly config: ConfigService,
  ) {
    this.ttlSeconds = parseInt(
      this.config.get<string>('SSG_CACHE_TTL_SECONDS') ?? '3600',
      10,
    );
  }

  /**
   * Ensure the ssg_cache table exists.
   * Uses CREATE TABLE IF NOT EXISTS so it's safe to run on every startup.
   * This replaces a formal migration since @mikro-orm/migrations is not installed.
   */
  async onModuleInit(): Promise<void> {
    try {
      const conn = this.em.getConnection();
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS "ssg_cache" (
          "id"         SERIAL PRIMARY KEY,
          "cache_key"  VARCHAR(512) NOT NULL UNIQUE,
          "value"      JSONB NOT NULL,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "expires_at" TIMESTAMPTZ
        );
      `);
      await conn.execute(`
        CREATE INDEX IF NOT EXISTS "idx_ssg_cache_expires_at"
          ON "ssg_cache" ("expires_at");
      `);
    } catch (err: any) {
      this.logger.warn(`Could not ensure ssg_cache table: ${err.message}`);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = await this.cacheRepo.findOne({ cacheKey: key });
    if (!entry) return null;

    if (entry.expiresAt && entry.expiresAt < new Date()) {
      // Expired — delete lazily
      await this.em.fork().removeAndFlush(entry);
      return null;
    }

    return entry.value as unknown as T;
  }

  async set<T extends Record<string, unknown>>(key: string, value: T): Promise<void> {
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000);

    const existing = await this.cacheRepo.findOne({ cacheKey: key });
    const fork = this.em.fork();

    if (existing) {
      existing.value = value;
      existing.createdAt = new Date();
      existing.expiresAt = expiresAt;
      await fork.flush();
    } else {
      const entry = fork.create(SsgCache, {
        cacheKey: key,
        value,
        createdAt: new Date(),
        expiresAt,
      });
      await fork.persistAndFlush(entry);
    }
  }

  async invalidate(keyPrefix: string): Promise<void> {
    const entries = await this.cacheRepo.find({
      cacheKey: { $like: `${keyPrefix}%` },
    });
    if (entries.length > 0) {
      const fork = this.em.fork();
      fork.remove(entries);
      await fork.flush();
      this.logger.log(`Invalidated ${entries.length} cache entries for prefix "${keyPrefix}"`);
    }
  }
}
