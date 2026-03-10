import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  ManyToOne,
  Rel,
  OptionalProps,
} from '@mikro-orm/core';
import { Dataset } from './dataset.entity';

export enum ChangeType {
  NEW_RECORD = 'NEW_RECORD',
  UPDATED_RECORD = 'UPDATED_RECORD',
  REMOVED_RECORD = 'REMOVED_RECORD',
  VALUE_CHANGE = 'VALUE_CHANGE',
}

@Entity({ tableName: 'dataset_diffs' })
export class DatasetDiff {
  [OptionalProps]?: 'detectedAt';

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Dataset, { index: true })
  datasetNew!: Rel<Dataset>;

  @ManyToOne(() => Dataset, { index: true })
  datasetPrevious!: Rel<Dataset>;

  @Property()
  fieldName!: string;

  @Property({ type: 'text', nullable: true })
  oldValue?: string;

  @Property({ type: 'text', nullable: true })
  newValue?: string;

  @Enum({ items: () => ChangeType })
  changeType!: ChangeType;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  detectedAt: Date = new Date();
}
