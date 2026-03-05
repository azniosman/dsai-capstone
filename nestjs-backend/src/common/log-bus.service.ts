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

import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Category of the log entry. */
export type LogEntryType = 'RAG' | 'LLM' | 'AWS' | 'SYSTEM' | 'ERROR' | 'INFO' | 'WARN';

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
  /** Optional key/value metadata (latency, chunk counts, provider name, etc.) */
  readonly meta?: Record<string, string | number | boolean>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of entries held in the ring buffer. */
const LOG_BUS_MAX_ENTRIES = 500;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class LogBusService {
  /** Internal ring buffer — oldest entries are evicted when full. */
  private readonly buffer: LogEntry[] = [];

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
    const full: LogEntry = {
      timestamp: entry.timestamp ?? new Date().toISOString(),
      type: entry.type,
      component: entry.component,
      message: entry.message,
      meta: entry.meta,
    };

    // Evict oldest entry if at capacity.
    if (this.buffer.length >= LOG_BUS_MAX_ENTRIES) {
      this.buffer.shift();
    }
    this.buffer.push(full);

    // Push to SSE stream (non-blocking — subscribers receive asynchronously).
    this.stream$.next(full);
  }

  /**
   * Returns the last `n` entries from the ring buffer, newest last.
   * Used by the polling fallback endpoint (`GET /api/logs/recent`).
   *
   * @param n - Number of entries to return (capped at {@link LOG_BUS_MAX_ENTRIES}).
   */
  getRecent(n = 200): LogEntry[] {
    const count = Math.min(n, LOG_BUS_MAX_ENTRIES);
    return this.buffer.slice(-count);
  }

  /**
   * Clears all entries from the ring buffer.
   * Intended for use in integration tests only.
   */
  clear(): void {
    this.buffer.length = 0;
  }
}
