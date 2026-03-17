import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OptionalProps,
  Rel,
  ManyToOne,
} from '@mikro-orm/core';
import { AuditFinding } from './audit-finding.entity';

export enum ReadinessCategory {
  ARCHITECTURE = 'ARCHITECTURE',
  SECURITY = 'SECURITY',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  AI_PIPELINE = 'AI_PIPELINE',
  PERFORMANCE = 'PERFORMANCE',
  OPERATIONAL = 'OPERATIONAL',
  DEPLOYMENT = 'DEPLOYMENT',
}

export enum ReadinessStatus {
  READY = 'READY',
  NOT_READY = 'NOT_READY',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  CRITICAL_ISSUES = 'CRITICAL_ISSUES',
}

@Entity({ tableName: 'production_readiness_reports' })
export class ProductionReadinessReport {
  [OptionalProps]?:
    | 'createdAt'
    | 'overallScore'
    | 'criticalBlockers'
    | 'highPriorityFixes'
    | 'recommendations'
    | 'architectureMap'
    | 'reportJson'
    | 'isBaseline';

  @PrimaryKey()
  id!: number;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  @Property({ type: 'json' })
  scores: {
    architecture: number;
    security: number;
    reliability: number;
    aiPipeline: number;
    operational: number;
    performance: number;
    overall: number;
  } = {
    architecture: 0,
    security: 0,
    reliability: 0,
    aiPipeline: 0,
    operational: 0,
    performance: 0,
    overall: 0,
  };

  @Enum({ items: () => ReadinessStatus })
  status: ReadinessStatus = ReadinessStatus.NOT_READY;

  @Property({ type: 'json', nullable: true })
  criticalBlockers?: string[];

  @Property({ type: 'json', nullable: true })
  highPriorityFixes?: string[];

  @Property({ type: 'json', nullable: true })
  recommendations?: string[];

  @Property({ type: 'json', nullable: true })
  architectureMap?: any;

  @Property({ type: 'text', nullable: true })
  reportJson?: string;

  @Property({ default: false })
  isBaseline: boolean = false;
}
