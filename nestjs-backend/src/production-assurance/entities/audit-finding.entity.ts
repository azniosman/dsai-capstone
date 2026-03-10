import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OptionalProps,
  ManyToOne,
  Rel,
} from '@mikro-orm/core';
import {
  ProductionReadinessReport,
  ReadinessCategory,
} from './production-readiness-report.entity';

export { ReadinessCategory };

export enum FindingSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO',
}

export enum FindingStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ACCEPTED_RISK = 'ACCEPTED_RISK',
}

@Entity({ tableName: 'audit_findings' })
export class AuditFinding {
  [OptionalProps]?:
    | 'createdAt'
    | 'updatedAt'
    | 'resolvedAt'
    | 'isFalsePositive'
    | 'occurrences'
    | 'file'
    | 'line'
    | 'evidence'
    | 'remediation'
    | 'report';

  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property({ type: 'text' })
  description!: string;

  @Enum({ items: () => FindingSeverity })
  severity: FindingSeverity = FindingSeverity.MEDIUM;

  @Enum({ items: () => FindingStatus })
  status: FindingStatus = FindingStatus.OPEN;

  @Enum({ items: () => ReadinessCategory })
  category: ReadinessCategory = ReadinessCategory.SECURITY;

  @Property()
  component!: string;

  @Property({ nullable: true })
  file?: string;

  @Property({ nullable: true })
  line?: number;

  @Property({ type: 'json', nullable: true })
  evidence?: any;

  @Property({ type: 'text', nullable: true })
  remediation?: string;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  @Property({
    type: 'datetime',
    defaultRaw: 'CURRENT_TIMESTAMP',
    onUpdate: () => new Date(),
  })
  updatedAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  resolvedAt?: Date;

  @ManyToOne(() => ProductionReadinessReport, { nullable: true })
  report?: Rel<ProductionReadinessReport>;

  @Property({ default: false })
  isFalsePositive: boolean = false;

  @Property({ type: 'int', default: 0 })
  occurrences: number = 0;
}
