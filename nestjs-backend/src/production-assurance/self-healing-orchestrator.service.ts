import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  RecoveryAction,
  RecoveryActionType,
  RecoveryStatus,
} from './entities/recovery-action.entity';
import { ExecutionTrace, TraceStatus } from './entities/execution-trace.entity';
import {
  SystemHealthMetric,
  HealthStatus,
} from './entities/system-health-metric.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomUUID } from 'crypto';

@Injectable()
export class SelfHealingOrchestratorService {
  private readonly logger = new Logger(SelfHealingOrchestratorService.name);
  private readonly recoveryHandlers: Map<
    RecoveryActionType,
    (action: RecoveryAction) => Promise<void>
  > = new Map();

  constructor(
    @InjectRepository(RecoveryAction)
    private readonly recoveryRepo: EntityRepository<RecoveryAction>,
    @InjectRepository(ExecutionTrace)
    private readonly traceRepo: EntityRepository<ExecutionTrace>,
    @InjectRepository(SystemHealthMetric)
    private readonly metricRepo: EntityRepository<SystemHealthMetric>,
    private readonly em: EntityManager,
  ) {
    this.registerRecoveryHandlers();
  }

  private registerRecoveryHandlers(): void {
    this.recoveryHandlers.set(
      RecoveryActionType.SERVICE_RESTART,
      this.handleServiceRestart.bind(this),
    );
    this.recoveryHandlers.set(
      RecoveryActionType.PIPELINE_RETRY,
      this.handlePipelineRetry.bind(this),
    );
    this.recoveryHandlers.set(
      RecoveryActionType.DATA_REPROCESS,
      this.handleDataReprocess.bind(this),
    );
    this.recoveryHandlers.set(
      RecoveryActionType.VECTOR_INDEX_REBUILD,
      this.handleVectorIndexRebuild.bind(this),
    );
    this.recoveryHandlers.set(
      RecoveryActionType.TASK_RESCHEDULE,
      this.handleTaskReschedule.bind(this),
    );
    this.recoveryHandlers.set(
      RecoveryActionType.CACHE_CLEAR,
      this.handleCacheClear.bind(this),
    );
    this.recoveryHandlers.set(
      RecoveryActionType.EMBEDDING_REGENERATE,
      this.handleEmbeddingRegenerate.bind(this),
    );
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processPendingRecoveries(): Promise<void> {
    const pendingActions = await this.recoveryRepo.findAll({
      where: { status: RecoveryStatus.PENDING },
      orderBy: { createdAt: 'ASC' },
    });

    for (const action of pendingActions) {
      await this.executeRecovery(action);
    }
  }

  private async executeRecovery(action: RecoveryAction): Promise<void> {
    const startTime = Date.now();
    action.status = RecoveryStatus.RUNNING;
    await this.em.flush();

    try {
      const handler = this.recoveryHandlers.get(action.type);
      if (!handler) {
        throw new Error(
          `No handler registered for recovery type: ${action.type}`,
        );
      }

      await handler(action);

      action.status = RecoveryStatus.COMPLETED;
      action.result = 'Recovery completed successfully';
      this.logger.log(
        `Recovery action ${action.actionId} completed successfully`,
      );
    } catch (error) {
      action.status = RecoveryStatus.FAILED;
      action.errorDetails = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
      this.logger.error(`Recovery action ${action.actionId} failed: ${error}`);
    }

    action.durationMs = Date.now() - startTime;
    action.completedAt = new Date();
    await this.em.flush();

    // Record metric
    await this.em.persistAndFlush(
      this.metricRepo.create({
        name: `recovery_${action.type.toLowerCase()}`,
        type: 'CUSTOM' as any,
        value: action.status === RecoveryStatus.COMPLETED ? 1 : 0,
        status:
          action.status === RecoveryStatus.COMPLETED
            ? HealthStatus.HEALTHY
            : HealthStatus.UNHEALTHY,
        service: 'self-healing',
        isAlerted: false,
        metadata: { actionId: action.actionId, type: action.type },
      }),
    );
  }

  private async handleServiceRestart(action: RecoveryAction): Promise<void> {
    // In production, this would call Docker API or Kubernetes API
    this.logger.log(`Simulating service restart for ${action.targetService}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async handlePipelineRetry(action: RecoveryAction): Promise<void> {
    const { originalTraceId, retryCount } = action.parameters || {};
    this.logger.log(
      `Retrying pipeline (attempt ${retryCount}) for trace ${originalTraceId}`,
    );

    // In production, this would re-queue the failed operation
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  private async handleDataReprocess(action: RecoveryAction): Promise<void> {
    this.logger.log(`Reprocessing data for ${action.targetComponent}`);
    // In production, this would trigger data reprocessing
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  private async handleVectorIndexRebuild(
    action: RecoveryAction,
  ): Promise<void> {
    this.logger.log('Rebuilding vector index...');
    // In production, this would call pgvector to rebuild HNSW index
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  private async handleTaskReschedule(action: RecoveryAction): Promise<void> {
    this.logger.log(`Rescheduling task for ${action.targetComponent}`);
    // In production, this would update EventBridge schedule
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  private async handleCacheClear(action: RecoveryAction): Promise<void> {
    this.logger.log(`Clearing cache for ${action.targetComponent}`);
    // In production, this would clear Redis or database cache
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  private async handleEmbeddingRegenerate(
    action: RecoveryAction,
  ): Promise<void> {
    this.logger.log('Regenerating embeddings...');
    // In production, this would re-run embedding generation
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  /**
   * Manually trigger a recovery action
   */
  async triggerRecovery(
    type: RecoveryActionType,
    description: string,
    targetService?: string,
    targetComponent?: string,
    parameters?: any,
    triggeredByUser?: string,
  ): Promise<string> {
    const actionId = randomUUID();

    const action = this.recoveryRepo.create({
      actionId,
      type,
      description,
      status: RecoveryStatus.PENDING,
      targetService,
      targetComponent,
      parameters,
      isAutomated: !triggeredByUser,
      triggeredByUser,
      createdAt: new Date(),
      durationMs: 0,
    });

    await this.em.persistAndFlush(action);
    this.logger.log(`Triggered manual recovery: ${actionId} - ${description}`);

    return actionId;
  }

  /**
   * Get recovery history
   */
  async getRecoveryHistory(limit: number = 50): Promise<RecoveryAction[]> {
    return await this.recoveryRepo.findAll({
      orderBy: { createdAt: 'DESC' },
      limit,
    });
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(hours: number = 24): Promise<{
    total: number;
    completed: number;
    failed: number;
    byType: Record<
      string,
      { total: number; completed: number; failed: number }
    >;
  }> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const actions = await this.recoveryRepo.findAll({
      where: { createdAt: { $gte: since } },
    });

    const stats = {
      total: actions.length,
      completed: actions.filter((a) => a.status === RecoveryStatus.COMPLETED)
        .length,
      failed: actions.filter((a) => a.status === RecoveryStatus.FAILED).length,
      byType: {} as Record<
        string,
        { total: number; completed: number; failed: number }
      >,
    };

    // Group by type
    const byTypeMap = new Map<
      string,
      { total: number; completed: number; failed: number }
    >();
    for (const action of actions) {
      const typeStats = byTypeMap.get(action.type) || {
        total: 0,
        completed: 0,
        failed: 0,
      };
      typeStats.total++;
      if (action.status === RecoveryStatus.COMPLETED) {
        typeStats.completed++;
      } else if (action.status === RecoveryStatus.FAILED) {
        typeStats.failed++;
      }
      byTypeMap.set(action.type, typeStats);
    }

    stats.byType = Object.fromEntries(byTypeMap);
    return stats;
  }

  /**
   * Detect system issues that may require recovery
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async detectIssues(): Promise<void> {
    // Check for stalled workers
    const unhealthyMetrics = await this.metricRepo.findAll({
      where: { status: HealthStatus.UNHEALTHY },
    });

    for (const metric of unhealthyMetrics) {
      if (!metric.isAlerted) {
        this.logger.warn(
          `Detected unhealthy metric: ${metric.name} in ${metric.service}`,
        );

        // Trigger appropriate recovery
        await this.triggerRecovery(
          RecoveryActionType.SERVICE_RESTART,
          `Auto-recovery for unhealthy ${metric.name}`,
          metric.service,
          metric.name,
          { metricId: metric.id },
        );

        metric.isAlerted = true;
        await this.em.flush();
      }
    }
  }
}
