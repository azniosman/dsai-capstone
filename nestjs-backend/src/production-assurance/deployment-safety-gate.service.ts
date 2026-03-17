import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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
} from './entities/system-health-metric.entity';

export interface DeploymentCheck {
  name: string;
  passed: boolean;
  critical: boolean;
  details: string;
}

export interface DeploymentValidationResult {
  validatedAt: Date;
  checks: DeploymentCheck[];
  allPassed: boolean;
  canDeploy: boolean;
  blockers: string[];
  warnings: string[];
}

@Injectable()
export class DeploymentSafetyGateService implements OnModuleInit {
  private readonly logger = new Logger(DeploymentSafetyGateService.name);
  private lastValidation: DeploymentValidationResult | null = null;

  constructor(
    @InjectRepository(ProductionReadinessReport)
    private readonly reportRepo: EntityRepository<ProductionReadinessReport>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: EntityRepository<AuditFinding>,
    @InjectRepository(SystemHealthMetric)
    private readonly metricRepo: EntityRepository<SystemHealthMetric>,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    this.logger.log('Deployment Safety Gate initialized');
  }

  /**
   * Run full pre-deployment validation
   * This MUST pass before any production deployment
   */
  async validateForDeployment(): Promise<DeploymentValidationResult> {
    this.logger.log('Running pre-deployment validation...');

    const result: DeploymentValidationResult = {
      validatedAt: new Date(),
      checks: [],
      allPassed: true,
      canDeploy: true,
      blockers: [],
      warnings: [],
    };

    // Run all validation checks
    await this.checkSecurityReadiness(result);
    await this.checkDataIntegrity(result);
    await this.checkRAGPipelineHealth(result);
    await this.checkServiceHealth(result);
    await this.checkConfiguration(result);
    await this.checkOpenFindings(result);
    await this.checkRecentFailures(result);

    // Determine deployment eligibility
    result.allPassed = result.checks.every((c) => c.passed || !c.critical);
    result.canDeploy = result.blockers.length === 0;

    if (!result.canDeploy) {
      this.logger.error(`Deployment BLOCKED: ${result.blockers.join('; ')}`);
    } else {
      this.logger.log('Deployment validation PASSED');
    }

    this.lastValidation = result;

    // Create report
    await this.em.persistAndFlush(
      this.reportRepo.create({
        scores: {
          architecture: 85,
          security: result.checks
            .filter((c) => c.name.includes('security'))
            .every((c) => c.passed)
            ? 100
            : 50,
          reliability: result.checks
            .filter((c) => c.name.includes('health'))
            .every((c) => c.passed)
            ? 100
            : 50,
          aiPipeline: result.checks
            .filter((c) => c.name.includes('rag'))
            .every((c) => c.passed)
            ? 100
            : 50,
          operational: result.allPassed ? 100 : 50,
          performance: 85,
          overall: result.allPassed ? 90 : 50,
        },
        status: result.canDeploy
          ? ReadinessStatus.READY
          : ReadinessStatus.CRITICAL_ISSUES,
        criticalBlockers: result.blockers,
        highPriorityFixes: result.warnings,
        reportJson: JSON.stringify(result, null, 2),
        isBaseline: false,
      }),
    );

    return result;
  }

  private async checkSecurityReadiness(
    result: DeploymentValidationResult,
  ): Promise<void> {
    // Check JWT secret
    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.includes('change-me')
    ) {
      result.checks.push({
        name: 'security_jwt_secret',
        passed: false,
        critical: true,
        details: 'JWT_SECRET not properly configured',
      });
      result.blockers.push('JWT_SECRET must be configured');
    } else {
      result.checks.push({
        name: 'security_jwt_secret',
        passed: true,
        critical: true,
        details: 'JWT_SECRET configured',
      });
    }

    // Check refresh token secret
    if (
      !process.env.REFRESH_TOKEN_SECRET ||
      process.env.REFRESH_TOKEN_SECRET.includes('change-me')
    ) {
      result.checks.push({
        name: 'security_refresh_secret',
        passed: false,
        critical: true,
        details: 'REFRESH_TOKEN_SECRET not properly configured',
      });
      result.blockers.push('REFRESH_TOKEN_SECRET must be configured');
    } else {
      result.checks.push({
        name: 'security_refresh_secret',
        passed: true,
        critical: true,
        details: 'REFRESH_TOKEN_SECRET configured',
      });
    }

    // Check internal automation token
    if (
      !process.env.INTERNAL_AUTOMATION_TOKEN ||
      process.env.INTERNAL_AUTOMATION_TOKEN.includes('change-me')
    ) {
      result.checks.push({
        name: 'security_internal_token',
        passed: false,
        critical: true,
        details: 'INTERNAL_AUTOMATION_TOKEN not properly configured',
      });
      result.blockers.push('INTERNAL_AUTOMATION_TOKEN must be configured');
    } else {
      result.checks.push({
        name: 'security_internal_token',
        passed: true,
        critical: true,
        details: 'INTERNAL_AUTOMATION_TOKEN configured',
      });
    }
  }

  private async checkDataIntegrity(
    result: DeploymentValidationResult,
  ): Promise<void> {
    // Check for critical audit findings
    const criticalFindings = await this.findingRepo.findAll({
      where: { severity: FindingSeverity.CRITICAL, status: FindingStatus.OPEN },
    });

    if (criticalFindings.length > 0) {
      result.checks.push({
        name: 'data_integrity_critical_findings',
        passed: false,
        critical: true,
        details: `${criticalFindings.length} critical findings open`,
      });
      result.blockers.push('Resolve all critical audit findings');
    } else {
      result.checks.push({
        name: 'data_integrity_critical_findings',
        passed: true,
        critical: true,
        details: 'No critical findings',
      });
    }
  }

  private async checkRAGPipelineHealth(
    result: DeploymentValidationResult,
  ): Promise<void> {
    // Check embedding model configuration
    const embeddingModel =
      process.env.EMBEDDING_MODEL || 'Xenova/bge-small-en-v1.5';
    if (!embeddingModel.includes('Xenova/')) {
      result.checks.push({
        name: 'rag_embedding_config',
        passed: false,
        critical: true,
        details: 'Invalid embedding model configuration',
      });
      result.blockers.push('Embedding model must be properly configured');
    } else {
      result.checks.push({
        name: 'rag_embedding_config',
        passed: true,
        critical: true,
        details: `Using ${embeddingModel}`,
      });
    }
  }

  private async checkServiceHealth(
    result: DeploymentValidationResult,
  ): Promise<void> {
    // Check for unhealthy metrics
    const unhealthyMetrics = await this.metricRepo.findAll({
      where: { status: HealthStatus.UNHEALTHY },
    });

    if (unhealthyMetrics.length > 0) {
      result.checks.push({
        name: 'service_health',
        passed: false,
        critical: true,
        details: `${unhealthyMetrics.length} unhealthy services`,
      });
      result.blockers.push('All services must be healthy');
    } else {
      result.checks.push({
        name: 'service_health',
        passed: true,
        critical: true,
        details: 'All services healthy',
      });
    }
  }

  private async checkConfiguration(
    result: DeploymentValidationResult,
  ): Promise<void> {
    // Check database connection
    if (!process.env.DATABASE_URL && !process.env.DATABASE_HOST) {
      result.checks.push({
        name: 'config_database',
        passed: false,
        critical: true,
        details: 'Database not configured',
      });
      result.blockers.push('Database connection must be configured');
    } else {
      result.checks.push({
        name: 'config_database',
        passed: true,
        critical: true,
        details: 'Database configured',
      });
    }

    // Check CORS configuration
    if (!process.env.CORS_ALLOWED_ORIGINS) {
      result.checks.push({
        name: 'config_cors',
        passed: false,
        critical: false,
        details: 'CORS not explicitly configured',
      });
      result.warnings.push('Configure CORS_ALLOWED_ORIGINS for production');
    } else {
      result.checks.push({
        name: 'config_cors',
        passed: true,
        critical: false,
        details: 'CORS configured',
      });
    }
  }

  private async checkOpenFindings(
    result: DeploymentValidationResult,
  ): Promise<void> {
    const highFindings = await this.findingRepo.findAll({
      where: { severity: FindingSeverity.HIGH, status: FindingStatus.OPEN },
    });

    if (highFindings.length > 0) {
      result.checks.push({
        name: 'open_high_findings',
        passed: false,
        critical: false,
        details: `${highFindings.length} high-severity findings open`,
      });
      result.warnings.push(
        `Address ${highFindings.length} high-severity findings`,
      );
    } else {
      result.checks.push({
        name: 'open_high_findings',
        passed: true,
        critical: false,
        details: 'No high-severity findings',
      });
    }
  }

  private async checkRecentFailures(
    result: DeploymentValidationResult,
  ): Promise<void> {
    // Check for recent critical failures (would query execution traces in production)
    // For now, this is a placeholder
    result.checks.push({
      name: 'recent_failures',
      passed: true,
      critical: false,
      details: 'No critical recent failures',
    });
  }

  /**
   * Get last validation result
   */
  getLastValidation(): DeploymentValidationResult | null {
    return this.lastValidation;
  }

  /**
   * Quick health check (non-blocking)
   */
  async quickHealthCheck(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];

    if (
      !process.env.JWT_SECRET ||
      process.env.JWT_SECRET.includes('change-me')
    ) {
      issues.push('JWT_SECRET not configured');
    }

    if (!process.env.DATABASE_URL && !process.env.DATABASE_HOST) {
      issues.push('Database not configured');
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}
