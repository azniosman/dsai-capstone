import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OptionalProps,
  ManyToOne,
  Index,
} from '@mikro-orm/core';
import type { Rel } from '@mikro-orm/core';
import { ExecutionTrace } from './execution-trace.entity';

export enum RecoveryActionType {
  SERVICE_RESTART = 'SERVICE_RESTART',
  PIPELINE_RETRY = 'PIPELINE_RETRY',
  DATA_REPROCESS = 'DATA_REPROCESS',
  VECTOR_INDEX_REBUILD = 'VECTOR_INDEX_REBUILD',
  TASK_RESCHEDULE = 'TASK_RESCHEDULE',
  CACHE_CLEAR = 'CACHE_CLEAR',
  CONNECTION_RESET = 'CONNECTION_RESET',
  EMBEDDING_REGENERATE = 'EMBEDDING_REGENERATE',
  CONFIG_RELOAD = 'CONFIG_RELOAD',
  CUSTOM = 'CUSTOM',
}

export enum RecoveryStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

@Entity({ tableName: 'recovery_actions' })
export class RecoveryAction {
  [OptionalProps]?:
    | 'createdAt'
    | 'completedAt'
    | 'targetService'
    | 'targetComponent'
    | 'parameters'
    | 'result'
    | 'errorDetails'
    | 'triggeredBy'
    | 'triggeredByUser'
    | 'rollbackPlan';

  @PrimaryKey()
  id!: number;

  @Index()
  @Property()
  actionId!: string;

  @Enum({ items: () => RecoveryActionType })
  type: RecoveryActionType = RecoveryActionType.CUSTOM;

  @Property()
  description!: string;

  @Enum({ items: () => RecoveryStatus })
  status: RecoveryStatus = RecoveryStatus.PENDING;

  @Property({ type: 'text', nullable: true })
  targetService?: string;

  @Property({ type: 'text', nullable: true })
  targetComponent?: string;

  @Property({ type: 'json', nullable: true })
  parameters?: any;

  @Property({ type: 'text', nullable: true })
  result?: string;

  @Property({ type: 'json', nullable: true })
  errorDetails?: any;

  @Property({ type: 'int' })
  durationMs!: number;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @ManyToOne(() => ExecutionTrace, { nullable: true })
  triggeredBy?: Rel<ExecutionTrace>;

  @Property({ default: false })
  isAutomated: boolean = true;

  @Property({ nullable: true })
  triggeredByUser?: string;

  @Property({ type: 'json', nullable: true })
  rollbackPlan?: any;
}
