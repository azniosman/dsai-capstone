import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
  OptionalProps,
} from '@mikro-orm/core';

export enum DatasetStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity({ tableName: 'datasets' })
export class Dataset {
  [OptionalProps]?: 'downloadedAt' | 'recordCount' | 'status';

  @PrimaryKey()
  id!: number;

  @Property({ index: true })
  datasetName!: string;

  @Property()
  datasetVersion!: string;

  @Property({ nullable: true })
  sourceUrl?: string;

  @Property()
  checksum!: string;

  @Property({ default: 0 })
  recordCount: number = 0;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  downloadedAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  processedAt?: Date;

  @Enum({ items: () => DatasetStatus, default: DatasetStatus.PENDING })
  status: DatasetStatus = DatasetStatus.PENDING;
}
