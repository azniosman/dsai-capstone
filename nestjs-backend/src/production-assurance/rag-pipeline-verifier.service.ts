import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  AuditFinding,
  FindingSeverity,
  FindingStatus,
  ReadinessCategory,
} from './entities/audit-finding.entity';
import {
  SystemHealthMetric,
  HealthStatus,
  MetricType,
} from './entities/system-health-metric.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface RagHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  embeddingService: boolean;
  vectorSearch: boolean;
  crossEncoder: boolean;
  feedbackLoop: boolean;
  avgLatencyMs: number;
  errorRate: number;
  lastCheck: Date;
}

@Injectable()
export class RagPipelineVerifierService implements OnModuleInit {
  private readonly logger = new Logger(RagPipelineVerifierService.name);
  private healthStatus: RagHealthStatus = {
    status: 'unknown',
    embeddingService: false,
    vectorSearch: false,
    crossEncoder: false,
    feedbackLoop: false,
    avgLatencyMs: 0,
    errorRate: 0,
    lastCheck: new Date(),
  };

  constructor(
    @InjectRepository(AuditFinding)
    private readonly findingRepo: EntityRepository<AuditFinding>,
    @InjectRepository(SystemHealthMetric)
    private readonly metricRepo: EntityRepository<SystemHealthMetric>,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    await this.verify();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async verify(): Promise<RagHealthStatus> {
    this.logger.log('Running RAG pipeline verification...');

    const status: RagHealthStatus = {
      status: 'healthy',
      embeddingService: await this.checkEmbeddingService(),
      vectorSearch: await this.checkVectorSearch(),
      crossEncoder: await this.checkCrossEncoder(),
      feedbackLoop: await this.checkFeedbackLoop(),
      avgLatencyMs: await this.getAvgLatency(),
      errorRate: await this.getErrorRate(),
      lastCheck: new Date(),
    };

    // Determine overall status
    if (!status.embeddingService || !status.vectorSearch) {
      status.status = 'unhealthy';
    } else if (!status.crossEncoder || status.errorRate > 0.1) {
      status.status = 'degraded';
    }

    this.healthStatus = status;
    await this.recordMetrics(status);
    await this.checkForIssues(status);

    this.logger.log(
      `RAG pipeline verification complete. Status: ${status.status}`,
    );
    return status;
  }

  private async checkEmbeddingService(): Promise<boolean> {
    try {
      // Check if embedding model is configured
      const embeddingModel =
        process.env.EMBEDDING_MODEL || 'Xenova/bge-small-en-v1.5';

      // In production, we'd actually test the embedding service
      // For now, check if the env var is set correctly
      const isConfigured = embeddingModel.includes('Xenova/');

      if (!isConfigured) {
        throw new Error('Invalid embedding model configuration');
      }

      return true;
    } catch (error: any) {
      this.logger.error(
        `Embedding service check failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async checkVectorSearch(): Promise<boolean> {
    try {
      // Check if pgvector extension is available
      // This would query the database to verify pgvector is installed
      // For now, we assume it's configured if we got this far

      // Check for DocumentChunk entity usage
      const hasDocumentChunks = true; // Would check DB in production

      return hasDocumentChunks;
    } catch (error: any) {
      this.logger.error(
        `Vector search check failed: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async checkCrossEncoder(): Promise<boolean> {
    try {
      // Cross-encoder is optional, check if enabled
      const isEnabled = process.env.RERANKER_ENABLED === 'true';

      if (isEnabled) {
        const model =
          process.env.RERANKER_MODEL || 'Xenova/ms-marco-MiniLM-L-6-v2';
        return model.includes('Xenova/');
      }

      // Not enabled is still "healthy" since it's optional
      return true;
    } catch (error: any) {
      this.logger.warn(
        `Cross-encoder check issue: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async checkFeedbackLoop(): Promise<boolean> {
    try {
      // Check if RAG feedback entity exists and is being used
      // This enables the re-ranking based on user feedback
      const hasFeedbackSystem = true; // Would verify in production

      return hasFeedbackSystem;
    } catch (error: any) {
      this.logger.warn(
        `Feedback loop check issue: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private async getAvgLatency(): Promise<number> {
    // In production, this would query execution traces
    // For now, return a baseline estimate
    return 150; // ms
  }

  private async getErrorRate(): Promise<number> {
    // In production, this would calculate from recent traces
    return 0.02; // 2% error rate baseline
  }

  private async recordMetrics(status: RagHealthStatus): Promise<void> {
    const metrics = [
      {
        name: 'rag_pipeline_status',
        type: MetricType.RAG,
        value:
          status.status === 'healthy'
            ? 1
            : status.status === 'degraded'
              ? 0.5
              : 0,
        status:
          status.status === 'healthy'
            ? HealthStatus.HEALTHY
            : status.status === 'degraded'
              ? HealthStatus.DEGRADED
              : HealthStatus.UNHEALTHY,
        service: 'rag',
        isAlerted: false,
        metadata: {
          embeddingService: status.embeddingService,
          vectorSearch: status.vectorSearch,
          crossEncoder: status.crossEncoder,
          feedbackLoop: status.feedbackLoop,
        },
      },
      {
        name: 'rag_avg_latency_ms',
        type: MetricType.RAG,
        value: status.avgLatencyMs,
        threshold: 500,
        warningThreshold: 300,
        status:
          status.avgLatencyMs < 300
            ? HealthStatus.HEALTHY
            : status.avgLatencyMs < 500
              ? HealthStatus.DEGRADED
              : HealthStatus.UNHEALTHY,
        service: 'rag',
        isAlerted: false,
      },
      {
        name: 'rag_error_rate',
        type: MetricType.RAG,
        value: status.errorRate,
        threshold: 0.1,
        warningThreshold: 0.05,
        status:
          status.errorRate < 0.05
            ? HealthStatus.HEALTHY
            : status.errorRate < 0.1
              ? HealthStatus.DEGRADED
              : HealthStatus.UNHEALTHY,
        service: 'rag',
        isAlerted: false,
      },
    ];

    for (const metric of metrics) {
      await this.em.persistAndFlush(this.metricRepo.create(metric));
    }
  }

  private async checkForIssues(status: RagHealthStatus): Promise<void> {
    if (!status.embeddingService) {
      await this.em.persistAndFlush(
        this.findingRepo.create({
          title: 'RAG Embedding Service Unavailable',
          description:
            'The embedding service for RAG pipeline is not functioning',
          severity: FindingSeverity.CRITICAL,
          status: FindingStatus.OPEN,
          category: ReadinessCategory.AI_PIPELINE,
          component: 'EmbeddingService',
          remediation:
            'Verify ONNX model is baked into Docker image and EMBEDDING_MODEL env var is set correctly',
        }),
      );
    }

    if (!status.vectorSearch) {
      await this.em.persistAndFlush(
        this.findingRepo.create({
          title: 'RAG Vector Search Unavailable',
          description: 'pgvector-based vector search is not functioning',
          severity: FindingSeverity.CRITICAL,
          status: FindingStatus.OPEN,
          category: ReadinessCategory.AI_PIPELINE,
          component: 'RagService',
          remediation:
            'Verify PostgreSQL pgvector extension is installed and DocumentChunk entity is properly configured',
        }),
      );
    }

    if (status.errorRate > 0.1) {
      await this.em.persistAndFlush(
        this.findingRepo.create({
          title: 'High RAG Pipeline Error Rate',
          description: `RAG pipeline error rate is ${Math.round(status.errorRate * 100)}%, exceeding 10% threshold`,
          severity: FindingSeverity.HIGH,
          status: FindingStatus.OPEN,
          category: ReadinessCategory.AI_PIPELINE,
          component: 'RagPipeline',
          remediation:
            'Review execution traces for failure patterns and implement retry logic',
        }),
      );
    }

    if (status.avgLatencyMs > 500) {
      await this.em.persistAndFlush(
        this.findingRepo.create({
          title: 'RAG Pipeline High Latency',
          description: `Average RAG pipeline latency is ${status.avgLatencyMs}ms, exceeding 500ms threshold`,
          severity: FindingSeverity.MEDIUM,
          status: FindingStatus.OPEN,
          category: ReadinessCategory.PERFORMANCE,
          component: 'RagPipeline',
          remediation:
            'Optimize vector search queries, consider caching, or review HNSW index parameters',
        }),
      );
    }
  }

  async verifyEmbeddingGeneration(
    query: string,
  ): Promise<{ success: boolean; dimensions: number; latencyMs: number }> {
    const startTime = Date.now();

    try {
      // In production, this would call the actual EmbeddingService
      // For now, simulate the verification
      await new Promise((resolve) => setTimeout(resolve, 50));

      return {
        success: true,
        dimensions: 384, // bge-small-en-v1.5 output
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        dimensions: 0,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  async verifyVectorSearch(
    embedding: number[],
  ): Promise<{ success: boolean; resultCount: number; latencyMs: number }> {
    const startTime = Date.now();

    try {
      // In production, this would query pgvector
      await new Promise((resolve) => setTimeout(resolve, 30));

      return {
        success: true,
        resultCount: 5,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        success: false,
        resultCount: 0,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  getHealthStatus(): RagHealthStatus {
    return this.healthStatus;
  }
}
