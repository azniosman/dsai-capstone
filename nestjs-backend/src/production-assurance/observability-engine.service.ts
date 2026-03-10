import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  SystemHealthMetric,
  HealthStatus,
  MetricType,
} from './entities/system-health-metric.entity';
import { ExecutionTrace, TraceStatus } from './entities/execution-trace.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  services: ServiceHealth[];
  metrics: MetricSnapshot[];
  alerts: Alert[];
  lastUpdated: Date;
}

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs?: number;
  errorRate?: number;
  lastCheck: Date;
}

export interface MetricSnapshot {
  name: string;
  value: number;
  status: HealthStatus;
  timestamp: Date;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  source: string;
  timestamp: Date;
  acknowledged: boolean;
}

@Injectable()
export class ObservabilityEngineService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ObservabilityEngineService.name);
  private healthStatus: SystemHealth;
  private readonly alerts: Alert[] = [];
  private metricsBuffer: Map<string, MetricSnapshot[]> = new Map();
  private readonly MAX_BUFFER_SIZE = 100;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(SystemHealthMetric)
    private readonly metricRepo: EntityRepository<SystemHealthMetric>,
    @InjectRepository(ExecutionTrace)
    private readonly traceRepo: EntityRepository<ExecutionTrace>,
    private eventEmitter: EventEmitter2,
    private readonly em: EntityManager,
  ) {
    this.healthStatus = {
      status: 'healthy',
      services: [],
      metrics: [],
      alerts: [],
      lastUpdated: new Date(),
    };
  }

  async onModuleInit() {
    await this.initialize();
    this.startHealthChecks();
    this.logger.log('Observability Engine initialized');
  }

  onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  async initialize(): Promise<void> {
    // Load recent metrics
    const recentMetrics = await this.metricRepo.findAll({
      orderBy: { createdAt: 'DESC' },
      limit: 100,
    });

    // Group by name
    const byName = new Map<string, MetricSnapshot[]>();
    for (const metric of recentMetrics) {
      const snapshots = byName.get(metric.name) || [];
      snapshots.push({
        name: metric.name,
        value: metric.value,
        status: metric.status,
        timestamp: metric.createdAt,
      });
      byName.set(metric.name, snapshots);
    }

    this.metricsBuffer = byName;
    await this.updateHealthStatus();
  }

  private startHealthChecks(): void {
    // Run health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.updateHealthStatus();
    }, 30000);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async collectMetrics(): Promise<void> {
    this.logger.debug('Collecting system metrics...');

    const metrics = [
      // Database health
      {
        name: 'database_connections',
        type: MetricType.DATABASE,
        value: await this.getDatabaseConnectionCount(),
        service: 'database',
        isAlerted: false,
      },
      // API health
      {
        name: 'api_requests_per_minute',
        type: MetricType.API,
        value: await this.getAPIRequestRate(),
        service: 'api',
        isAlerted: false,
      },
      // Memory usage (simulated)
      {
        name: 'memory_usage_mb',
        type: MetricType.MEMORY,
        value: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        service: 'backend',
        isAlerted: false,
      },
      // Active traces
      {
        name: 'active_traces',
        type: MetricType.CUSTOM,
        value: await this.getActiveTraceCount(),
        service: 'tracing',
        isAlerted: false,
      },
    ];

    for (const metric of metrics) {
      const status = this.determineMetricStatus(metric.name, metric.value);

      await this.em.persistAndFlush(
        this.metricRepo.create({
          ...metric,
          status,
          createdAt: new Date(),
        }),
      );

      // Update buffer
      const snapshots = this.metricsBuffer.get(metric.name) || [];
      snapshots.push({
        name: metric.name,
        value: metric.value,
        status,
        timestamp: new Date(),
      });

      // Trim buffer
      if (snapshots.length > this.MAX_BUFFER_SIZE) {
        snapshots.shift();
      }
      this.metricsBuffer.set(metric.name, snapshots);

      // Emit event for new metric
      this.eventEmitter.emit('metric.collected', { metric, status });

      // Check for alerts
      if (status === HealthStatus.UNHEALTHY) {
        await this.createAlert(
          'critical',
          `${metric.name} is unhealthy`,
          metric.service,
        );
      }
    }
  }

  private async updateHealthStatus(): Promise<void> {
    const recentMetrics = await this.metricRepo.findAll({
      where: { createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } },
    });

    const services = new Map<
      string,
      { metrics: SystemHealthMetric[]; statuses: HealthStatus[] }
    >();

    for (const metric of recentMetrics) {
      const serviceData = services.get(metric.service) || {
        metrics: [],
        statuses: [],
      };
      serviceData.metrics.push(metric);
      serviceData.statuses.push(metric.status);
      services.set(metric.service, serviceData);
    }

    const serviceHealth: ServiceHealth[] = [];
    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const [serviceName, data] of services.entries()) {
      const dominantStatus = this.getDominantStatus(data.statuses);
      serviceHealth.push({
        name: serviceName,
        status: dominantStatus,
        lastCheck: new Date(),
      });

      if (dominantStatus === HealthStatus.UNHEALTHY) hasUnhealthy = true;
      if (dominantStatus === HealthStatus.DEGRADED) hasDegraded = true;
    }

    this.healthStatus = {
      status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      services: serviceHealth,
      metrics: Array.from(this.metricsBuffer.values()).flat().slice(-50),
      alerts: this.alerts.filter((a) => !a.acknowledged),
      lastUpdated: new Date(),
    };
  }

  private getDominantStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.some((s) => s === HealthStatus.UNHEALTHY))
      return HealthStatus.UNHEALTHY;
    if (statuses.some((s) => s === HealthStatus.DEGRADED))
      return HealthStatus.DEGRADED;
    if (statuses.some((s) => s === HealthStatus.HEALTHY))
      return HealthStatus.HEALTHY;
    return HealthStatus.UNKNOWN;
  }

  private determineMetricStatus(name: string, value: number): HealthStatus {
    const thresholds: Record<
      string,
      { warning: number; critical: number; higherIsWorse: boolean }
    > = {
      memory_usage_mb: { warning: 500, critical: 800, higherIsWorse: true },
      active_traces: { warning: 100, critical: 500, higherIsWorse: true },
      database_connections: { warning: 80, critical: 95, higherIsWorse: true },
    };

    const threshold = thresholds[name];
    if (!threshold) return HealthStatus.HEALTHY;

    if (threshold.higherIsWorse) {
      if (value >= threshold.critical) return HealthStatus.UNHEALTHY;
      if (value >= threshold.warning) return HealthStatus.DEGRADED;
    } else {
      if (value <= threshold.critical) return HealthStatus.UNHEALTHY;
      if (value <= threshold.warning) return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }

  private async createAlert(
    severity: 'critical' | 'warning' | 'info',
    message: string,
    source: string,
  ): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      source,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.eventEmitter.emit('alert.created', alert);

    this.logger.warn(`ALERT [${severity.toUpperCase()}]: ${message}`);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  getHealthStatus(): SystemHealth {
    return this.healthStatus;
  }

  getMetricsHistory(name: string, limit: number = 50): MetricSnapshot[] {
    const snapshots = this.metricsBuffer.get(name) || [];
    return snapshots.slice(-limit);
  }

  getAllServices(): ServiceHealth[] {
    return this.healthStatus.services;
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter((a) => !a.acknowledged);
  }

  // Helper methods
  private async getDatabaseConnectionCount(): Promise<number> {
    // In production, this would query pg_stat_activity
    return Math.floor(Math.random() * 20) + 5;
  }

  private async getAPIRequestRate(): Promise<number> {
    // In production, this would count requests from logs
    return Math.floor(Math.random() * 100) + 10;
  }

  private async getActiveTraceCount(): Promise<number> {
    return await this.traceRepo.count({ status: TraceStatus.RUNNING });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldMetrics(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const qb = this.metricRepo.createQueryBuilder('m');
    const result = await qb
      .delete()
      .where({ createdAt: { $lt: cutoff } })
      .execute();

    this.logger.log(`Cleaned up ${result.affectedRows || 0} old metrics`);
  }
}
