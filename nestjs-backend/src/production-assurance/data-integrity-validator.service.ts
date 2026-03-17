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
  ProductionReadinessReport,
  ReadinessStatus,
} from './entities/production-readiness-report.entity';
import {
  SystemHealthMetric,
  HealthStatus,
  MetricType,
} from './entities/system-health-metric.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DataIntegrityValidatorService implements OnModuleInit {
  private readonly logger = new Logger(DataIntegrityValidatorService.name);
  private integrityScore: number = 100;

  constructor(
    @InjectRepository(AuditFinding)
    private readonly findingRepo: EntityRepository<AuditFinding>,
    @InjectRepository(ProductionReadinessReport)
    private readonly reportRepo: EntityRepository<ProductionReadinessReport>,
    @InjectRepository(SystemHealthMetric)
    private readonly metricRepo: EntityRepository<SystemHealthMetric>,
    private readonly em: EntityManager,
  ) {}

  async onModuleInit() {
    await this.validate();
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async validate(): Promise<DataIntegrityResult> {
    this.logger.log('Starting data integrity validation...');

    const result: DataIntegrityResult = {
      validatedAt: new Date(),
      checks: [],
      issues: 0,
      score: 100,
    };

    // Run all integrity checks
    await this.checkSchemaConsistency(result);
    await this.checkForeignKeyIntegrity(result);
    await this.checkOrphanRecords(result);
    await this.checkDuplicateRecords(result);
    await this.checkEmbeddingIntegrity(result);
    await this.checkIndexHealth(result);

    // Calculate score
    result.score = Math.max(0, 100 - result.issues * 5);
    this.integrityScore = result.score;

    // Record metric
    await this.em.persistAndFlush(
      this.metricRepo.create({
        name: 'data_integrity_score',
        type: MetricType.DATABASE,
        value: result.score,
        threshold: 80,
        warningThreshold: 90,
        status:
          result.score >= 90
            ? HealthStatus.HEALTHY
            : result.score >= 80
              ? HealthStatus.DEGRADED
              : HealthStatus.UNHEALTHY,
        service: 'database',
        isAlerted: false,
      }),
    );

    this.logger.log(
      `Data integrity validation complete. Score: ${result.score}/100`,
    );
    return result;
  }

  private async checkSchemaConsistency(
    result: DataIntegrityResult,
  ): Promise<void> {
    this.logger.log('Checking schema consistency...');

    try {
      // Check if all expected tables exist
      const expectedTables = [
        'user',
        'user_profile',
        'tenant',
        'skill',
        'job_role',
        'sctp_course',
        'skill_progress',
        'profile_snapshot',
        'document_chunk',
        'rag_feedback',
        'ssg_cache',
        'system_document',
        'dataset',
        'live_matrix_data',
        'trend_signal',
        'dataset_diff',
        'production_readiness_reports',
        'audit_findings',
        'system_health_metrics',
        'execution_traces',
        'recovery_actions',
      ];

      const query = `
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      `;
      const dbResult = await this.em.getConnection('read').execute(query);
      const existingTables = dbResult.map((r: any) => r.table_name);

      const missingTables = expectedTables.filter(
        (t) => !existingTables.includes(t),
      );

      if (missingTables.length > 0) {
        result.checks.push({
          name: 'schema_consistency',
          passed: false,
          details: `Missing tables: ${missingTables.join(', ')}`,
        });
        result.issues++;

        await this.em.persistAndFlush(
          this.findingRepo.create({
            title: 'Database schema inconsistency',
            description: `Missing expected tables: ${missingTables.join(', ')}`,
            severity: FindingSeverity.CRITICAL,
            status: FindingStatus.OPEN,
            category: ReadinessCategory.DATA_INTEGRITY,
            component: 'Database',
            remediation: 'Run schema migration to create missing tables',
          }),
        );
      } else {
        result.checks.push({
          name: 'schema_consistency',
          passed: true,
          details: 'All expected tables present',
        });
      }
    } catch (error: any) {
      result.checks.push({
        name: 'schema_consistency',
        passed: false,
        details: error.message,
      });
      result.issues++;
    }
  }

  private async checkForeignKeyIntegrity(
    result: DataIntegrityResult,
  ): Promise<void> {
    this.logger.log('Checking foreign key integrity...');

    try {
      // Check for orphaned records in key relationships
      const orphanChecks = [
        {
          table: 'user_profile',
          column: 'user_id',
          refTable: 'user',
          name: 'user_profile.user_id -> user.id',
        },
        {
          table: 'skill_progress',
          column: 'profile_id',
          refTable: 'user_profile',
          name: 'skill_progress.profile_id -> user_profile.id',
        },
        {
          table: 'document_chunk',
          column: 'dataset_id',
          refTable: 'dataset',
          name: 'document_chunk.dataset_id -> dataset.id',
        },
      ];

      let orphanFound = false;
      for (const check of orphanChecks) {
        const query = `
          SELECT COUNT(*) as count FROM "${check.table}" t
          LEFT JOIN "${check.refTable}" r ON t.${check.column} = r.id
          WHERE r.id IS NULL AND t.${check.column} IS NOT NULL
        `;
        const dbResult = await this.em.getConnection('read').execute(query);
        const orphanCount = dbResult[0]?.count || 0;

        if (orphanCount > 0) {
          orphanFound = true;
          result.checks.push({
            name: `fk_${check.name}`,
            passed: false,
            details: `${orphanCount} orphaned records in ${check.table}`,
          });
          result.issues++;
        }
      }

      if (!orphanFound) {
        result.checks.push({
          name: 'foreign_key_integrity',
          passed: true,
          details: 'No orphaned records found',
        });
      }
    } catch (error: any) {
      result.checks.push({
        name: 'foreign_key_integrity',
        passed: false,
        details: error.message,
      });
      result.issues++;
    }
  }

  private async checkOrphanRecords(result: DataIntegrityResult): Promise<void> {
    this.logger.log('Checking for orphan records...');

    try {
      // Check for profiles without users
      const query = `
        SELECT COUNT(*) as count FROM user_profile WHERE user_id IS NULL
      `;
      const dbResult = await this.em.getConnection('read').execute(query);
      const orphanCount = dbResult[0]?.count || 0;

      if (orphanCount > 0) {
        result.checks.push({
          name: 'orphan_profiles',
          passed: false,
          details: `${orphanCount} profiles without users`,
        });
        result.issues++;
      } else {
        result.checks.push({
          name: 'orphan_records',
          passed: true,
          details: 'No critical orphan records',
        });
      }
    } catch (error: any) {
      result.checks.push({
        name: 'orphan_records',
        passed: false,
        details: error.message,
      });
      result.issues++;
    }
  }

  private async checkDuplicateRecords(
    result: DataIntegrityResult,
  ): Promise<void> {
    this.logger.log('Checking for duplicate records...');

    try {
      // Check for duplicate skills
      const skillQuery = `
        SELECT name, COUNT(*) as count FROM skill GROUP BY name HAVING COUNT(*) > 1
      `;
      const skillDuplicates = await this.em
        .getConnection('read')
        .execute(skillQuery);

      if (skillDuplicates.length > 0) {
        result.checks.push({
          name: 'duplicate_skills',
          passed: false,
          details: `${skillDuplicates.length} duplicate skill names`,
        });
        result.issues++;
      } else {
        result.checks.push({
          name: 'duplicate_records',
          passed: true,
          details: 'No critical duplicates found',
        });
      }
    } catch (error: any) {
      result.checks.push({
        name: 'duplicate_records',
        passed: false,
        details: error.message,
      });
      result.issues++;
    }
  }

  private async checkEmbeddingIntegrity(
    result: DataIntegrityResult,
  ): Promise<void> {
    this.logger.log('Checking embedding integrity...');

    try {
      // Check for document chunks without embeddings
      const query = `
        SELECT COUNT(*) as count FROM document_chunk WHERE embedding IS NULL
      `;
      const dbResult = await this.em.getConnection('read').execute(query);
      const nullEmbeddings = dbResult[0]?.count || 0;

      if (nullEmbeddings > 0) {
        result.checks.push({
          name: 'embedding_integrity',
          passed: false,
          details: `${nullEmbeddings} chunks without embeddings`,
        });
        result.issues++;

        await this.em.persistAndFlush(
          this.findingRepo.create({
            title: 'Missing embeddings in document chunks',
            description: `${nullEmbeddings} document chunks are missing vector embeddings`,
            severity: FindingSeverity.HIGH,
            status: FindingStatus.OPEN,
            category: ReadinessCategory.DATA_INTEGRITY,
            component: 'RAG',
            remediation:
              'Run embedding backfill job to generate missing embeddings',
          }),
        );
      } else {
        result.checks.push({
          name: 'embedding_integrity',
          passed: true,
          details: 'All chunks have embeddings',
        });
      }
    } catch (error: any) {
      result.checks.push({
        name: 'embedding_integrity',
        passed: false,
        details: error.message,
      });
      result.issues++;
    }
  }

  private async checkIndexHealth(result: DataIntegrityResult): Promise<void> {
    this.logger.log('Checking index health...');

    try {
      // Check if pgvector index exists
      const indexQuery = `
        SELECT indexname FROM pg_indexes 
        WHERE tablename = 'document_chunk' AND indexname LIKE '%embedding%'
      `;
      const indexes = await this.em.getConnection('read').execute(indexQuery);

      if (indexes.length === 0) {
        result.checks.push({
          name: 'vector_index',
          passed: false,
          details: 'No vector index found',
        });
        result.issues++;
      } else {
        result.checks.push({
          name: 'index_health',
          passed: true,
          details: 'Vector indexes present',
        });
      }
    } catch (error: any) {
      result.checks.push({
        name: 'index_health',
        passed: false,
        details: error.message,
      });
      result.issues++;
    }
  }

  getIntegrityScore(): number {
    return this.integrityScore;
  }
}

export interface DataIntegrityResult {
  validatedAt: Date;
  checks: Array<{ name: string; passed: boolean; details: string }>;
  issues: number;
  score: number;
}
