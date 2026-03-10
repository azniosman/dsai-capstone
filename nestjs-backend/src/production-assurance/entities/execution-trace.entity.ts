import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OptionalProps,
  Index,
  ManyToOne,
  Rel,
} from '@mikro-orm/core';

export enum TraceStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRIED = 'RETRIED',
  RECOVERED = 'RECOVERED',
}

export enum TraceType {
  REQUEST = 'REQUEST',
  API_CALL = 'API_CALL',
  DATABASE_QUERY = 'DATABASE_QUERY',
  AI_INFERENCE = 'AI_INFERENCE',
  RAG_PIPELINE = 'RAG_PIPELINE',
  EMBEDDING = 'EMBEDDING',
  VECTOR_SEARCH = 'VECTOR_SEARCH',
  BACKGROUND_JOB = 'BACKGROUND_JOB',
  DATA_INGESTION = 'DATA_INGESTION',
  RECOVERY_ACTION = 'RECOVERY_ACTION',
}

@Entity({ tableName: 'execution_traces' })
export class ExecutionTrace {
  [OptionalProps]?:
    | 'createdAt'
    | 'completedAt'
    | 'parentTraceId'
    | 'correlationId'
    | 'input'
    | 'output'
    | 'error'
    | 'errorStack'
    | 'metadata'
    | 'memoryUsageMb'
    | 'cpuUsagePercent'
    | 'retryCount';

  @PrimaryKey()
  id!: number;

  @Index()
  @Property()
  traceId!: string;

  @Index()
  @Property({ nullable: true })
  parentTraceId?: string;

  @Index()
  @Property({ nullable: true })
  correlationId?: string;

  @Enum({ items: () => TraceType })
  type: TraceType = TraceType.REQUEST;

  @Property()
  name!: string;

  @Property({ type: 'json', nullable: true })
  input?: any;

  @Property({ type: 'json', nullable: true })
  output?: any;

  @Enum({ items: () => TraceStatus })
  status: TraceStatus = TraceStatus.PENDING;

  @Property({ type: 'text', nullable: true })
  error?: string;

  @Property({ type: 'json', nullable: true })
  errorStack?: any;

  @Property({ type: 'int' })
  durationMs!: number;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Property()
  service!: string;

  @Property({ default: 0 })
  retryCount: number = 0;

  @Property({ type: 'json', nullable: true })
  metadata?: any;

  @Property({ type: 'float', nullable: true })
  memoryUsageMb?: number;

  @Property({ type: 'float', nullable: true })
  cpuUsagePercent?: number;
}
