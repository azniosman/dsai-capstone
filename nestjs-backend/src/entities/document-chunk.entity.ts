/**
 * @file document-chunk.entity.ts
 * @description Stores chunked text with pgvector embeddings for RAG retrieval.
 *
 * Each row represents one text chunk derived from a source document (resume,
 * job description, etc.).  The `embedding` column holds a 384-dimensional
 * float vector compatible with `all-MiniLM-L6-v2`.
 *
 * Idempotency: `(content_hash, profile_id)` is unique — re-uploading the same
 * document does not create duplicate embeddings.
 */

import {
  Entity,
  Index,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Property,
  Rel,
  Unique,
} from '@mikro-orm/core';
import { UserProfile } from './user-profile.entity';
import { Tenant } from './tenant.entity';
import { VectorType } from '@app/common/types/vector.type';

/** Source document types stored in document_chunk. */
export type ChunkSourceType = 'resume' | 'jd' | 'note';

@Entity({ tableName: 'document_chunk' })
@Unique({ properties: ['contentHash', 'profile'] })
export class DocumentChunk {
  [OptionalProps]?: 'createdAt' | 'chunkIndex' | 'embedding';

  @PrimaryKey()
  id!: number;

  /** Raw text of this chunk (up to ~2 000 characters). */
  @Property({ type: 'text' })
  content!: string;

  /**
   * SHA-256 hex of the chunk text (first 64 chars) used for idempotency.
   * Combined with `profile` it forms the unique index.
   */
  @Property({ length: 64 })
  @Index()
  contentHash!: string;

  /** Where this chunk came from: 'resume', 'jd', 'note'. */
  @Property({ length: 50 })
  sourceType!: ChunkSourceType;

  /** Zero-based position within the source document. */
  @Property({ nullable: true })
  chunkIndex?: number = 0;

  /**
   * 384-dim embedding vector (all-MiniLM-L6-v2).
   * NULL for chunks created before the embedding pipeline ran — the backfill
   * automation fills these in.
   */
  @Property({ type: VectorType, length: 384, nullable: true })
  embedding?: number[];

  /** The profile this chunk belongs to (nullable for anonymous uploads). */
  @ManyToOne(() => UserProfile, { nullable: true, index: true, deleteRule: 'cascade' })
  profile?: Rel<UserProfile>;

  /** Tenant isolation. */
  @ManyToOne(() => Tenant, { nullable: true, index: true })
  tenant?: Rel<Tenant>;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();
}
