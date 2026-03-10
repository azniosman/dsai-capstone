import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  ExecutionTrace,
  TraceType,
  TraceStatus,
} from './entities/execution-trace.entity';
import {
  RecoveryAction,
  RecoveryActionType,
  RecoveryStatus,
} from './entities/recovery-action.entity';
import { randomUUID } from 'crypto';

// Re-export types for consumers
export { TraceType, TraceStatus };

export interface TraceContext {
  traceId: string;
  parentTraceId?: string;
  correlationId?: string;
  service: string;
  metadata?: Record<string, any>;
}

export interface TraceStep {
  name: string;
  type: TraceType;
  input?: any;
  output?: any;
  startTime: number;
  endTime?: number;
  status: TraceStatus;
  error?: string;
}

@Injectable()
export class ExecutionTraceService implements OnModuleInit {
  private readonly logger = new Logger(ExecutionTraceService.name);
  private readonly activeTraces: Map<string, TraceContext> = new Map();
  private readonly traceSteps: Map<string, TraceStep[]> = new Map();

  constructor(
    @InjectRepository(ExecutionTrace)
    private readonly traceRepo: EntityRepository<ExecutionTrace>,
    @InjectRepository(RecoveryAction)
    private readonly recoveryRepo: EntityRepository<RecoveryAction>,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    this.logger.log('Execution Trace Service initialized');
  }

  /**
   * Start a new execution trace
   */
  async startTrace(
    name: string,
    type: TraceType,
    service: string,
    input?: any,
    parentTraceId?: string,
    correlationId?: string,
  ): Promise<string> {
    const traceId = randomUUID();

    const trace = this.traceRepo.create({
      traceId,
      parentTraceId,
      correlationId,
      type,
      name,
      input,
      status: TraceStatus.RUNNING,
      service,
      createdAt: new Date(),
      durationMs: 0,
      retryCount: 0,
    });

    await this.em.persistAndFlush(trace);

    this.activeTraces.set(traceId, {
      traceId,
      parentTraceId,
      correlationId,
      service,
    });

    this.traceSteps.set(traceId, []);

    return traceId;
  }

  /**
   * Complete a trace successfully
   */
  async completeTrace(
    traceId: string,
    output?: any,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const trace = await this.traceRepo.findOne({ traceId });
    if (!trace) {
      this.logger.warn(`Trace ${traceId} not found for completion`);
      return;
    }

    const startTime = trace.createdAt.getTime();
    const endTime = Date.now();

    trace.status = TraceStatus.COMPLETED;
    trace.output = output;
    trace.metadata = metadata;
    trace.durationMs = endTime - startTime;
    trace.completedAt = new Date();

    await this.em.flush();
    this.activeTraces.delete(traceId);
  }

  /**
   * Mark a trace as failed
   */
  async failTrace(
    traceId: string,
    error: Error,
    retryCount: number = 0,
  ): Promise<void> {
    const trace = await this.traceRepo.findOne({ traceId });
    if (!trace) {
      this.logger.warn(`Trace ${traceId} not found for failure`);
      return;
    }

    const startTime = trace.createdAt.getTime();
    const endTime = Date.now();

    trace.status = TraceStatus.FAILED;
    trace.error = error.message;
    trace.errorStack = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    trace.durationMs = endTime - startTime;
    trace.retryCount = retryCount;
    trace.completedAt = new Date();

    await this.em.flush();
    this.activeTraces.delete(traceId);

    // Trigger recovery if needed
    if (retryCount < 3) {
      await this.triggerRecovery(traceId, trace);
    }
  }

  /**
   * Add a step to an active trace
   */
  async addTraceStep(
    traceId: string,
    step: {
      name: string;
      type: TraceType;
      input?: any;
      output?: any;
    },
  ): Promise<void> {
    const steps = this.traceSteps.get(traceId) || [];
    const stepStartTime = Date.now();

    const fullStep: TraceStep = {
      name: step.name,
      type: step.type,
      input: step.input,
      output: step.output,
      startTime: stepStartTime,
      endTime: step.output ? Date.now() : undefined,
      status: TraceStatus.RUNNING,
    };

    steps.push(fullStep);
    this.traceSteps.set(traceId, steps);

    // Also persist important steps
    if (
      step.type === TraceType.AI_INFERENCE ||
      step.type === TraceType.RAG_PIPELINE
    ) {
      const stepEndTime = step.output ? Date.now() : stepStartTime;
      await this.em.persistAndFlush(
        this.traceRepo.create({
          traceId: `${traceId}:step:${steps.length}`,
          parentTraceId: traceId,
          type: step.type,
          name: step.name,
          input: step.input,
          output: step.output,
          status: TraceStatus.COMPLETED,
          service: 'step',
          durationMs: stepEndTime - stepStartTime,
          createdAt: new Date(stepStartTime),
          completedAt: step.output ? new Date(stepEndTime) : undefined,
        }),
      );
    }
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string): Promise<ExecutionTrace | null> {
    return await this.traceRepo.findOne({ traceId });
  }

  /**
   * Get all traces for a correlation ID
   */
  async getTracesByCorrelation(
    correlationId: string,
  ): Promise<ExecutionTrace[]> {
    return await this.traceRepo.findAll({
      where: { correlationId },
      orderBy: { createdAt: 'ASC' },
    });
  }

  /**
   * Get recent failed traces
   */
  async getRecentFailures(limit: number = 10): Promise<ExecutionTrace[]> {
    return await this.traceRepo.findAll({
      where: { status: TraceStatus.FAILED },
      orderBy: { createdAt: 'DESC' },
      limit,
    });
  }

  /**
   * Trigger automated recovery for a failed trace
   */
  private async triggerRecovery(
    traceId: string,
    trace: ExecutionTrace,
  ): Promise<void> {
    const actionId = randomUUID();

    const recoveryAction = this.recoveryRepo.create({
      actionId,
      type: this.determineRecoveryType(trace.type),
      description: `Auto-recovery for failed ${trace.type}: ${trace.name}`,
      status: RecoveryStatus.PENDING,
      targetService: trace.service,
      targetComponent: trace.name,
      parameters: {
        originalTraceId: traceId,
        retryCount: trace.retryCount + 1,
        error: trace.error,
      },
      isAutomated: true,
      createdAt: new Date(),
      durationMs: 0,
    });

    await this.em.persistAndFlush(recoveryAction);

    this.logger.log(
      `Triggered recovery action ${actionId} for trace ${traceId}`,
    );
  }

  private determineRecoveryType(traceType: TraceType): RecoveryActionType {
    switch (traceType) {
      case TraceType.EMBEDDING:
        return RecoveryActionType.EMBEDDING_REGENERATE;
      case TraceType.VECTOR_SEARCH:
        return RecoveryActionType.VECTOR_INDEX_REBUILD;
      case TraceType.AI_INFERENCE:
        return RecoveryActionType.PIPELINE_RETRY;
      case TraceType.DATA_INGESTION:
        return RecoveryActionType.DATA_REPROCESS;
      case TraceType.BACKGROUND_JOB:
        return RecoveryActionType.TASK_RESCHEDULE;
      default:
        return RecoveryActionType.PIPELINE_RETRY;
    }
  }

  /**
   * Create a trace wrapper for async operations
   */
  async traceAsync<T>(
    name: string,
    type: TraceType,
    service: string,
    operation: () => Promise<T>,
    input?: any,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const traceId = await this.startTrace(
      name,
      type,
      service,
      input,
      undefined,
      metadata?.correlationId,
    );

    try {
      const result = await operation();
      await this.completeTrace(traceId, result, metadata);
      return result;
    } catch (error) {
      await this.failTrace(
        traceId,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Get trace statistics
   */
  async getTraceStats(hours: number = 24): Promise<{
    total: number;
    completed: number;
    failed: number;
    avgDurationMs: number;
    byType: Record<
      string,
      { total: number; failed: number; avgDurationMs: number }
    >;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const traces = await this.traceRepo.findAll({
      where: { createdAt: { $gte: since } },
    });

    const stats = {
      total: traces.length,
      completed: traces.filter((t) => t.status === TraceStatus.COMPLETED)
        .length,
      failed: traces.filter((t) => t.status === TraceStatus.FAILED).length,
      avgDurationMs: 0,
      byType: {} as Record<
        string,
        { total: number; failed: number; avgDurationMs: number }
      >,
    };

    if (traces.length > 0) {
      stats.avgDurationMs = Math.round(
        traces.reduce((sum, t) => sum + t.durationMs, 0) / traces.length,
      );
    }

    // Group by type
    const byTypeMap = new Map<
      string,
      { durations: number[]; failed: number }
    >();
    for (const trace of traces) {
      const typeStats = byTypeMap.get(trace.type) || {
        durations: [],
        failed: 0,
      };
      typeStats.durations.push(trace.durationMs);
      if (trace.status === TraceStatus.FAILED) {
        typeStats.failed++;
      }
      byTypeMap.set(trace.type, typeStats);
    }

    for (const [type, data] of byTypeMap.entries()) {
      stats.byType[type] = {
        total: data.durations.length,
        failed: data.failed,
        avgDurationMs: Math.round(
          data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
        ),
      };
    }

    return stats;
  }

  /**
   * Clean up old traces (retention policy)
   */
  async cleanupOldTraces(daysToKeep: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const qb = this.traceRepo.createQueryBuilder('t');
    const result = await qb
      .delete()
      .where({ createdAt: { $lt: cutoff } })
      .execute();

    this.logger.log(
      `Cleaned up ${result.affectedRows || 0} traces older than ${daysToKeep} days`,
    );
    return result.affectedRows || 0;
  }
}
