import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OptionalProps,
  Index,
} from '@mikro-orm/core';

export enum MetricType {
  CPU = 'CPU',
  MEMORY = 'MEMORY',
  DISK = 'DISK',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  API = 'API',
  AI_PIPELINE = 'AI_PIPELINE',
  RAG = 'RAG',
  QUEUE = 'QUEUE',
  CUSTOM = 'CUSTOM',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

@Entity({ tableName: 'system_health_metrics' })
export class SystemHealthMetric {
  [OptionalProps]?:
    | 'createdAt'
    | 'threshold'
    | 'warningThreshold'
    | 'metadata'
    | 'isAlerted';

  @PrimaryKey()
  id!: number;

  @Index()
  @Property()
  name!: string;

  @Enum({ items: () => MetricType })
  type: MetricType = MetricType.CUSTOM;

  @Property({ type: 'float' })
  value!: number;

  @Property({ type: 'float', nullable: true })
  threshold?: number;

  @Property({ type: 'float', nullable: true })
  warningThreshold?: number;

  @Property({ type: 'json', nullable: true })
  metadata?: any;

  @Enum({ items: () => HealthStatus })
  status: HealthStatus = HealthStatus.UNKNOWN;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  @Property()
  service!: string;

  @Property({ default: false })
  isAlerted: boolean = false;
}
