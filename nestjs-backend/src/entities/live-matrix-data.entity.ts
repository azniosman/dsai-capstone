import { Entity, PrimaryKey, Property, ManyToOne, Rel, OptionalProps } from '@mikro-orm/core';
import { Dataset } from './dataset.entity';

@Entity({ tableName: 'live_matrix_data' })
export class LiveMatrixData {
  [OptionalProps]?: 'createdAt' | 'growthRate' | 'demandIndex' | 'supplyIndex';

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Dataset, { index: true })
  dataset!: Rel<Dataset>;

  @Property({ index: true })
  year!: number;

  @Property({ index: true })
  sector!: string;

  @Property({ index: true })
  jobRole!: string;

  @Property()
  skillCategory!: string;

  @Property({ type: 'float', default: 0 })
  demandIndex: number = 0;

  @Property({ type: 'float', default: 0 })
  supplyIndex: number = 0;

  @Property({ type: 'float', default: 0 })
  growthRate: number = 0;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();
}
