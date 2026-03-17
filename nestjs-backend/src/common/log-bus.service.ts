/**
 * @file log-bus.service.ts
 * @description Singleton service that owns an in-memory circular ring buffer of
 * structured log entries. All backend services emit events through this bus.
 *
 * - Holds the last {@link LOG_BUS_MAX_ENTRIES} entries (default 500).
 * - Exposes an RxJS `Subject` for Server-Sent Events streaming.
 * - Exposes `getRecent(n)` for polling fallback.
 *
 * ### Lambda note
 * Because Lambda instances are ephemeral, the ring buffer is per-warm-instance.
 * Enable `CLOUDWATCH_LOG_STREAM_ENABLED=true` to additionally drain entries to
 * CloudWatch Logs Insights for cross-instance aggregation (not implemented in
 * this version — the env flag is reserved for future use).
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Subject } from 'rxjs';
import { ClsService } from 'nestjs-cls';
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'crypto';
import { SystemLog } from './system-log.entity';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Category of the log entry. */
export type LogEntryType =
  | 'RAG'
  | 'LLM'
  | 'AWS'
  | 'SYSTEM'
  | 'ERROR'
  | 'INFO'
  | 'WARN';

/** A single structured log entry emitted by any backend service. */
export interface LogEntry {
  /** ISO-8601 timestamp. */
  readonly timestamp: string;
  /** Broad category for UI filtering. */
  readonly type: LogEntryType;
  /** Source service/component name (e.g. `RagService`, `LlmService`). */
  readonly component: string;
  /** Human-readable message. */
  readonly message: string;
  /** Unique request trace ID pulled from AsyncLocalStorage. */
  readonly traceId?: string;
  /** Optional key/value metadata (latency, chunk counts, provider name, etc.) */
  readonly meta?: Record<string, string | number | boolean>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of entries held in the ring buffer. */
const LOG_BUS_MAX_ENTRIES = 500;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class LogBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogBusService.name);

  /** Internal ring buffer — oldest entries are evicted when full. */
  private readonly buffer: LogEntry[] = [];

  /** Queue of logs waiting to be flushed to PostgreSQL. */
  private readonly dbQueue: SystemLog[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly cls: ClsService,
    private readonly em: EntityManager,
  ) {}

  onModuleInit() {
    this.flushTimer = setInterval(() => this.flush(), 5000);
  }

  onModuleDestroy() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }

  private flush(): void {
    if (this.dbQueue.length === 0) return;

    // Atomically drain queue
    const batch = this.dbQueue.splice(0, this.dbQueue.length);
    void this.em
      .fork()
      .insertMany(SystemLog, batch)
      .catch((err) => {
        this.logger.error(
          `Failed to flush ${batch.length} logs to PostgreSQL: ${(err as Error).message}`,
        );
      });
  }

  /**
   * RxJS Subject used to push new entries to Server-Sent Event subscribers.
   * Controllers subscribe to this stream and forward each emission as an SSE
   * `data:` frame.
   */
  readonly stream$ = new Subject<LogEntry>();

  /**
   * Emits a structured log entry onto the ring buffer and the SSE stream.
   *
   * @param entry - Partial entry; `timestamp` is auto-populated if omitted.
   */
  emit(entry: Omit<LogEntry, 'timestamp'> & { timestamp?: string }): void {
    const traceId = entry.traceId ?? this.cls.getId();

    const full: LogEntry = {
      timestamp: entry.timestamp ?? new Date().toISOString(),
      type: entry.type,
      component: entry.component,
      message: entry.message,
      traceId,
      meta: entry.meta,
    };

    // Evict oldest entry if at capacity.
    if (this.buffer.length >= LOG_BUS_MAX_ENTRIES) {
      this.buffer.shift();
    }
    this.buffer.push(full);

    // Queue for PostgreSQL background flush
    this.dbQueue.push({
      id: randomUUID(),
      timestamp: new Date(full.timestamp),
      type: full.type,
      component: full.component,
      message: full.message,
      traceId: full.traceId,
      meta: full.meta,
    });

    // Push to SSE stream (non-blocking — subscribers receive asynchronously).
    this.stream$.next(full);
  }

  /**
   * Returns the last `n` entries from the ring buffer, newest last.
   * Used by the polling fallback endpoint (`GET /api/logs/recent`).
   *
   * @param n - Number of entries to return (capped at {@link LOG_BUS_MAX_ENTRIES}).
   */
  async getRecent(n = 200): Promise<LogEntry[]> {
    const count = Math.min(n, LOG_BUS_MAX_ENTRIES);

    // Always query DB to ensure we survive lambda cold starts
    const logs = await this.em
      .fork()
      .find(SystemLog, {}, { orderBy: { timestamp: 'DESC' }, limit: count });

    return logs.reverse().map((l) => ({
      timestamp: l.timestamp.toISOString(),
      type: l.type,
      component: l.component,
      message: l.message,
      traceId: l.traceId,
      meta: l.meta,
    }));
  }

  /**
   * Clears all entries from the ring buffer.
   * Intended for use in integration tests only.
   */
  clear(): void {
    this.buffer.length = 0;
  }
}
