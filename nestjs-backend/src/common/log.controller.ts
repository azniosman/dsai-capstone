/**
 * @file log.controller.ts
 * @description Exposes structured log entries emitted by the `LogBusService`.
 *
 * Two endpoints:
 *
 * - `GET /api/logs/recent?n=200` — JSON polling fallback. Returns last N
 *   entries from the ring buffer. Safe for API Gateway / Lambda.
 *
 * - `GET /api/logs/stream` — Server-Sent Events stream. Pushes each new
 *   `LogEntry` from `LogBusService.stream$` as an SSE `data:` frame.
 *   Sends a heartbeat comment every 15 s to keep the connection alive through
 *   proxies. Note: Lambda's 29-second API Gateway timeout means this endpoint
 *   is best used behind a long-polling-aware ALB or in local dev; in
 *   production, the polling fallback (`/recent`) is the reliable path.
 */

import {
  Controller,
  Get,
  Query,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { LogBusService, LogEntry } from '@app/common/log-bus.service';

@Controller('logs')
export class LogController {
  constructor(private readonly logBus: LogBusService) {}

  // ─── Polling (JSON) ────────────────────────────────────────────────────────

  /**
   * Returns the last `n` log entries as JSON.
   * Frontend polls this every 3 seconds as a fallback when SSE is unavailable.
   *
   * GET /api/logs/recent?n=200
   */
  @Get('recent')
  getRecent(
    @Query('n', new DefaultValuePipe(200), ParseIntPipe) n: number,
  ): LogEntry[] {
    return this.logBus.getRecent(Math.min(n, 500));
  }

  // ─── SSE Stream ────────────────────────────────────────────────────────────

  /**
   * Opens a Server-Sent Events stream. Each `LogEntry` emitted by
   * `LogBusService` is serialised as an SSE `data:` frame.
   *
   * A heartbeat comment (`:\n\n`) is sent every 15 s to prevent upstream
   * proxies from closing idle connections.
   *
   * GET /api/logs/stream
   */
  @Get('stream')
  streamLogs(@Res() res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();

    // Send heartbeat every 15 s.
    const heartbeat = setInterval(() => {
      res.write(':\n\n'); // SSE comment — ignored by browser EventSource
    }, 15_000);

    // Subscribe to the live stream.
    const sub = this.logBus.stream$.subscribe({
      next: (entry: LogEntry) => {
        res.write(`data: ${JSON.stringify(entry)}\n\n`);
      },
      error: () => {
        clearInterval(heartbeat);
        res.end();
      },
    });

    // Clean up when client disconnects.
    res.on('close', () => {
      clearInterval(heartbeat);
      sub.unsubscribe();
      res.end();
    });
  }
}
