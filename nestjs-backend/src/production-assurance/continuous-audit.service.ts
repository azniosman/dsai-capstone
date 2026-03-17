import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, EntityManager } from '@mikro-orm/postgresql';
import {
  ProductionReadinessReport,
  ReadinessStatus,
} from './entities/production-readiness-report.entity';
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

export interface AuditResult {
  auditId: string;
  timestamp: Date;
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  scores: {
    architecture: number;
    security: number;
    reliability: number;
    aiPipeline: number;
    operational: number;
    performance: number;
    overall: number;
  };
  status: ReadinessStatus;
  recommendations: string[];
}

@Injectable()
export class ContinuousAuditService {
  private readonly logger = new Logger(ContinuousAuditService.name);
  private isRunning = false;
  private lastAuditResult: AuditResult | null = null;

  constructor(
    @InjectRepository(ProductionReadinessReport)
    private readonly reportRepo: EntityRepository<ProductionReadinessReport>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: EntityRepository<AuditFinding>,
    @InjectRepository(SystemHealthMetric)
    private readonly metricRepo: EntityRepository<SystemHealthMetric>,
    private readonly em: EntityManager,
  ) {}

  async start(): Promise<void> {
    this.logger.log('Continuous Audit Service started');
    // Initial audit
    await this.runAudit();
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async runAudit(): Promise<AuditResult> {
    if (this.isRunning) {
      this.logger.warn('Audit already running, skipping');
      return this.lastAuditResult!;
    }

    this.isRunning = true;
    this.logger.log('Starting continuous audit...');

    const auditId = `audit-${Date.now()}`;
    const timestamp = new Date();

    try {
      // Collect findings
      const findings = {
        critical: await this.findingRepo.count({
          severity: FindingSeverity.CRITICAL,
          status: FindingStatus.OPEN,
        }),
        high: await this.findingRepo.count({
          severity: FindingSeverity.HIGH,
          status: FindingStatus.OPEN,
        }),
        medium: await this.findingRepo.count({
          severity: FindingSeverity.MEDIUM,
          status: FindingStatus.OPEN,
        }),
        low: await this.findingRepo.count({
          severity: FindingSeverity.LOW,
          status: FindingStatus.OPEN,
        }),
      };

      // Calculate scores
      const scores = await this.calculateScores();

      // Determine status
      let status = ReadinessStatus.READY;
      if (findings.critical > 0) {
        status = ReadinessStatus.CRITICAL_ISSUES;
      } else if (findings.high > 3) {
        status = ReadinessStatus.NOT_READY;
      } else if (findings.medium > 10 || scores.overall < 70) {
        status = ReadinessStatus.NEEDS_ATTENTION;
      }

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        findings,
        scores,
      );

      const result: AuditResult = {
        auditId,
        timestamp,
        findings,
        scores,
        status,
        recommendations,
      };

      this.lastAuditResult = result;

      // Save report
      await this.em.persistAndFlush(
        this.reportRepo.create({
          scores,
          status,
          criticalBlockers:
            findings.critical > 0 ? ['Critical findings must be resolved'] : [],
          highPriorityFixes:
            findings.high > 0
              ? [`Resolve ${findings.high} high-severity findings`]
              : [],
          recommendations,
          reportJson: JSON.stringify(result, null, 2),
          isBaseline: false,
        }),
      );

      // Record metrics
      await this.recordMetrics(scores);

      this.logger.log(
        `Audit complete. Status: ${status}, Overall Score: ${scores.overall}`,
      );
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  private async calculateScores(): Promise<AuditResult['scores']> {
    const scores = {
      architecture: 85,
      security: 100,
      reliability: 100,
      aiPipeline: 90,
      operational: 80,
      performance: 85,
      overall: 0,
    };

    // Deduct for findings
    const criticalFindings = await this.findingRepo.count({
      severity: FindingSeverity.CRITICAL,
      status: FindingStatus.OPEN,
    });
    const highFindings = await this.findingRepo.count({
      severity: FindingSeverity.HIGH,
      status: FindingStatus.OPEN,
    });
    const mediumFindings = await this.findingRepo.count({
      severity: FindingSeverity.MEDIUM,
      status: FindingStatus.OPEN,
    });

    // Security score
    scores.security = Math.max(
      0,
      100 - criticalFindings * 25 - highFindings * 10 - mediumFindings * 3,
    );

    // Reliability score (based on health metrics)
    const unhealthyMetrics = await this.metricRepo.count({
      status: HealthStatus.UNHEALTHY,
    });
    const degradedMetrics = await this.metricRepo.count({
      status: HealthStatus.DEGRADED,
    });
    scores.reliability = Math.max(
      0,
      100 - unhealthyMetrics * 20 - degradedMetrics * 5,
    );

    // AI Pipeline score
    const aiFindings = await this.findingRepo.count({
      category: ReadinessCategory.AI_PIPELINE,
      status: FindingStatus.OPEN,
    });
    scores.aiPipeline = Math.max(0, 100 - aiFindings * 15);

    // Operational score
    const operationalFindings = await this.findingRepo.count({
      category: ReadinessCategory.OPERATIONAL,
      status: FindingStatus.OPEN,
    });
    scores.operational = Math.max(0, 100 - operationalFindings * 10);

    // Calculate overall (weighted average)
    scores.overall = Math.round(
      scores.architecture * 0.15 +
        scores.security * 0.25 +
        scores.reliability * 0.2 +
        scores.aiPipeline * 0.15 +
        scores.operational * 0.15 +
        scores.performance * 0.1,
    );

    return scores;
  }

  private async generateRecommendations(
    findings: AuditResult['findings'],
    scores: AuditResult['scores'],
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (findings.critical > 0) {
      recommendations.push(
        `URGENT: Resolve ${findings.critical} critical findings immediately`,
      );
    }

    if (findings.high > 0) {
      recommendations.push(
        `Address ${findings.high} high-severity findings within 24 hours`,
      );
    }

    if (scores.security < 80) {
      recommendations.push(
        'Improve security posture - review authentication and secrets management',
      );
    }

    if (scores.reliability < 80) {
      recommendations.push('Investigate and resolve unhealthy service metrics');
    }

    if (scores.aiPipeline < 80) {
      recommendations.push(
        'Review RAG pipeline configuration and embedding generation',
      );
    }

    if (scores.operational < 80) {
      recommendations.push(
        'Improve operational procedures and monitoring coverage',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'System is production-ready. Continue regular monitoring.',
      );
    }

    return recommendations;
  }

  private async recordMetrics(scores: AuditResult['scores']): Promise<void> {
    const metrics = [
      { name: 'audit_score_architecture', value: scores.architecture },
      { name: 'audit_score_security', value: scores.security },
      { name: 'audit_score_reliability', value: scores.reliability },
      { name: 'audit_score_ai_pipeline', value: scores.aiPipeline },
      { name: 'audit_score_operational', value: scores.operational },
      { name: 'audit_score_performance', value: scores.performance },
      { name: 'audit_score_overall', value: scores.overall },
    ];

    for (const metric of metrics) {
      await this.em.persistAndFlush(
        this.metricRepo.create({
          name: metric.name,
          type: MetricType.CUSTOM,
          value: metric.value,
          threshold: 80,
          warningThreshold: 70,
          status:
            metric.value >= 80
              ? HealthStatus.HEALTHY
              : metric.value >= 70
                ? HealthStatus.DEGRADED
                : HealthStatus.UNHEALTHY,
          service: 'audit',
          isAlerted: false,
        }),
      );
    }
  }

  getLastAuditResult(): AuditResult | null {
    return this.lastAuditResult;
  }

  async getAuditHistory(
    limit: number = 10,
  ): Promise<ProductionReadinessReport[]> {
    return await this.reportRepo.findAll({
      orderBy: { createdAt: 'DESC' },
      limit,
    });
  }

  /**
   * Get production readiness summary
   */
  async getReadinessSummary(): Promise<{
    isReady: boolean;
    overallScore: number;
    status: ReadinessStatus;
    criticalBlockers: number;
    lastAudit: Date | null;
  }> {
    const reports = await this.reportRepo.findAll({
      orderBy: { id: 'DESC' },
      limit: 1,
    });
    const latestReport = reports[0] || null;

    if (!latestReport) {
      return {
        isReady: false,
        overallScore: 0,
        status: ReadinessStatus.NOT_READY,
        criticalBlockers: 0,
        lastAudit: null,
      };
    }

    return {
      isReady: latestReport.status === ReadinessStatus.READY,
      overallScore: latestReport.scores?.overall || 0,
      status: latestReport.status,
      criticalBlockers: await this.findingRepo.count({
        severity: FindingSeverity.CRITICAL,
        status: FindingStatus.OPEN,
      }),
      lastAudit: latestReport.createdAt || null,
    };
  }
}
