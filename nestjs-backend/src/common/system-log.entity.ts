import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import type { LogEntryType } from './log-bus.service';

@Entity()
export class SystemLog {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ type: 'timestamp with time zone' })
  @Index()
  timestamp!: Date;

  @Property({ type: 'varchar', length: 20 })
  @Index()
  type!: LogEntryType;

  @Property({ type: 'varchar', length: 100 })
  @Index()
  component!: string;

  @Property({ type: 'text' })
  message!: string;

  @Property({ type: 'varchar', length: 50, nullable: true })
  @Index()
  traceId?: string;

  @Property({ type: 'jsonb', nullable: true })
  meta?: Record<string, any>;
}
