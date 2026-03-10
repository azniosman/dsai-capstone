import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  Rel,
  OptionalProps,
} from '@mikro-orm/core';
import { Dataset } from './dataset.entity';

@Entity({ tableName: 'trend_signals' })
export class TrendSignal {
  [OptionalProps]?: 'createdAt';

  @PrimaryKey()
  id!: number;

  @Property({ index: true })
  sector!: string;

  @Property({ index: true })
  jobRole!: string;

  @Property()
  trendType!: string;

  @Property({ type: 'float' })
  trendScore!: number;

  @Property({ type: 'float' })
  confidence!: number;

  @ManyToOne(() => Dataset, { index: true })
  dataset!: Rel<Dataset>;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();
}
