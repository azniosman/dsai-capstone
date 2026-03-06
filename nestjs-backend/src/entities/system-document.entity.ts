import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { VectorType } from '@app/common/types/vector.type';

@Entity({ tableName: 'system_documents' })
export class SystemDocument {
  @PrimaryKey()
  id: string = randomUUID();

  @Property({ type: 'text' })
  filePath!: string;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'text', nullable: true })
  chunkHash?: string;

  @Property({ type: VectorType, length: 384, nullable: true })
  embedding?: number[];

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
