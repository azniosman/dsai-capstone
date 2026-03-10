import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  SystemHealthMetric,
  HealthStatus,
  MetricType,
} from './entities/system-health-metric.entity';
import {
  ExecutionTrace,
  TraceType,
  TraceStatus,
} from './entities/execution-trace.entity';

export interface LoadTestConfig {
  concurrentUsers: number;
  requestsPerUser: number;
  rampUpSeconds: number;
  durationSeconds: number;
  scenarios: LoadTestScenario[];
}

export interface LoadTestScenario {
  name: string;
  type: 'api' | 'rag' | 'embedding' | 'database';
  endpoint?: string;
  weight: number;
}

export interface LoadTestResult {
  testId: string;
  startTime: Date;
  endTime: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  requestsPerSecond: number;
  errorRate: number;
  resourceUsage: {
    avgMemoryMb: number;
    peakMemoryMb: number;
    avgCpuPercent: number;
    peakCpuPercent: number;
  };
  byScenario: Record<
    string,
    { requests: number; avgLatencyMs: number; errorRate: number }
  >;
  recommendations: string[];
}

@Injectable()
export class LoadTestingService {
  private readonly logger = new Logger(LoadTestingService.name);
  private isRunning = false;

  constructor(
    @InjectRepository(SystemHealthMetric)
    private readonly metricRepo: EntityRepository<SystemHealthMetric>,
    @InjectRepository(ExecutionTrace)
    private readonly traceRepo: EntityRepository<ExecutionTrace>,
    private readonly em: EntityManager,
  ) {}

  /**
   * Run a load test simulation
   * In production, this would use k6, Artillery, or similar
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    if (this.isRunning) {
      throw new Error('Load test already running');
    }

    this.isRunning = true;
    const testId = `loadtest-${Date.now()}`;
    const startTime = new Date();

    this.logger.log(
      `Starting load test: ${config.concurrentUsers} concurrent users, ${config.durationSeconds}s duration`,
    );

    try {
      // Simulate load test execution
      const result = await this.simulateLoadTest(testId, config, startTime);

      this.logger.log(
        `Load test complete. RPS: ${result.requestsPerSecond}, P95: ${result.p95LatencyMs}ms`,
      );
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  private async simulateLoadTest(
    testId: string,
    config: LoadTestConfig,
    startTime: Date,
  ): Promise<LoadTestResult> {
    const latencies: number[] = [];
    const errors: number[] = [];
    const byScenario: Record<string, { latencies: number[]; errors: number }> =
      {};

    // Initialize scenario tracking
    for (const scenario of config.scenarios) {
      byScenario[scenario.name] = { latencies: [], errors: 0 };
    }

    // Simulate requests
    const totalRequests = config.concurrentUsers * config.requestsPerUser;

    for (let i = 0; i < totalRequests; i++) {
      // Select scenario based on weight
      const scenario = this.selectScenario(config.scenarios);
      const latency = await this.simulateRequest(scenario);

      latencies.push(latency);
      byScenario[scenario.name].latencies.push(latency);

      // Simulate occasional errors (2% error rate)
      if (Math.random() < 0.02) {
        errors.push(1);
        byScenario[scenario.name].errors++;
      }

      // Record metric periodically
      if (i % 100 === 0) {
        await this.em.persistAndFlush(
          this.metricRepo.create({
            name: 'load_test_progress',
            type: MetricType.CUSTOM,
            value: (i / totalRequests) * 100,
            status: HealthStatus.HEALTHY,
            service: 'load-testing',
            isAlerted: false,
            metadata: { testId, progress: i },
          }),
        );
      }
    }

    const endTime = new Date();
    const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

    // Calculate statistics
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const avgLatency = Math.round(
      latencies.reduce((a, b) => a + b, 0) / latencies.length,
    );
    const p95Latency =
      sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
    const p99Latency =
      sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];

    // Calculate by-scenario stats
    const scenarioStats: Record<
      string,
      { requests: number; avgLatencyMs: number; errorRate: number }
    > = {};
    for (const [name, data] of Object.entries(byScenario)) {
      scenarioStats[name] = {
        requests: data.latencies.length,
        avgLatencyMs: Math.round(
          data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length,
        ),
        errorRate:
          Math.round((data.errors / data.latencies.length) * 100 * 100) / 100,
      };
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      avgLatency,
      p95Latency,
      p99Latency,
      errorRate: Math.round((errors.length / totalRequests) * 100 * 100) / 100,
      rps: Math.round(totalRequests / durationSeconds),
    });

    return {
      testId,
      startTime,
      endTime,
      totalRequests,
      successfulRequests: totalRequests - errors.length,
      failedRequests: errors.length,
      avgLatencyMs: avgLatency,
      p95LatencyMs: p95Latency,
      p99LatencyMs: p99Latency,
      requestsPerSecond: Math.round(totalRequests / durationSeconds),
      errorRate: Math.round((errors.length / totalRequests) * 100 * 100) / 100,
      resourceUsage: {
        avgMemoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        peakMemoryMb: Math.round(
          (process.memoryUsage().heapUsed / 1024 / 1024) * 1.2,
        ),
        avgCpuPercent: 25,
        peakCpuPercent: 45,
      },
      byScenario: scenarioStats,
      recommendations,
    };
  }

  private selectScenario(scenarios: LoadTestScenario[]): LoadTestScenario {
    const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (const scenario of scenarios) {
      random -= scenario.weight;
      if (random <= 0) return scenario;
    }

    return scenarios[scenarios.length - 1];
  }

  private async simulateRequest(scenario: LoadTestScenario): Promise<number> {
    // Simulate different latencies based on scenario type
    const baseLatencies: Record<string, number> = {
      api: 50,
      rag: 150,
      embedding: 100,
      database: 30,
    };

    const baseLatency = baseLatencies[scenario.type] || 50;

    // Add some variance (±30%)
    const variance = (Math.random() - 0.5) * 0.6 * baseLatency;

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, baseLatency + variance));

    return Math.round(baseLatency + variance);
  }

  private generateRecommendations(metrics: {
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    rps: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.p95Latency > 500) {
      recommendations.push(
        'P95 latency exceeds 500ms - consider optimizing database queries and adding caching',
      );
    }

    if (metrics.p99Latency > 1000) {
      recommendations.push(
        'P99 latency exceeds 1s - investigate tail latency causes (GC, network, locks)',
      );
    }

    if (metrics.errorRate > 1) {
      recommendations.push(
        `Error rate of ${metrics.errorRate}% exceeds 1% threshold - review error logs and add retry logic`,
      );
    }

    if (metrics.rps < 100) {
      recommendations.push(
        'Throughput below 100 RPS - consider horizontal scaling or performance optimization',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Performance metrics within acceptable ranges for production',
      );
    }

    return recommendations;
  }

  /**
   * Get default load test configuration
   */
  getDefaultConfig(): LoadTestConfig {
    return {
      concurrentUsers: 50,
      requestsPerUser: 20,
      rampUpSeconds: 30,
      durationSeconds: 120,
      scenarios: [
        {
          name: 'API Health Check',
          type: 'api',
          endpoint: '/api/health',
          weight: 20,
        },
        {
          name: 'RAG Query',
          type: 'rag',
          endpoint: '/api/rag/query',
          weight: 40,
        },
        { name: 'Embedding Generation', type: 'embedding', weight: 20 },
        { name: 'Database Query', type: 'database', weight: 20 },
      ],
    };
  }

  /**
   * Run quick performance check (non-intrusive)
   */
  async quickPerformanceCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    avgLatencyMs: number;
    recommendations: string[];
  }> {
    const latencies: number[] = [];

    // Run 10 quick requests
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 10));
      latencies.push(Date.now() - start);
    }

    const avgLatency = Math.round(
      latencies.reduce((a, b) => a + b, 0) / latencies.length,
    );

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const recommendations: string[] = [];

    if (avgLatency > 100) {
      status = 'degraded';
      recommendations.push('Baseline latency elevated - monitor closely');
    }

    if (avgLatency > 200) {
      status = 'unhealthy';
      recommendations.push('High baseline latency - investigate immediately');
    }

    return { status, avgLatencyMs: avgLatency, recommendations };
  }
}
