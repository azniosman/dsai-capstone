import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity({ tableName: 'system_documents' })
export class SystemDocument {
  @PrimaryKey()
  id: string = randomUUID();

  @Property({ type: 'text' })
  filePath!: string;

  @Property({ type: 'text' })
  content!: string;

  @Property({ type: 'text', nullable: true })
  chunkHash?: string; // useful for detecting diffs

  // pgvector extension must be enabled on the database!
  // using 384 dimensions for bge-small-en-v1.5
  @Property({ type: 'vector', length: 384, nullable: true })
  embedding?: number[];

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
