import {
  Entity,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  type Rel,
} from '@mikro-orm/core';
import { DocumentChunk } from './document-chunk.entity';
import { UserProfile } from './user-profile.entity';

/**
 * Stores thumbs-up / thumbs-down signals for RAG responses.
 *
 * Collected via `POST /api/rag/feedback`.  In Phase 5 these signals
 * will be used to re-rank retrieval results — chunks with net positive
 * feedback receive a small RRF score boost for the same user.
 */
@Entity({ tableName: 'rag_feedback' })
export class RagFeedback {
  @PrimaryKey()
  id!: number;

  /** The document chunk the user reacted to. */
  @ManyToOne(() => DocumentChunk, {
    nullable: true,
    index: true,
    deleteRule: 'cascade',
  })
  chunk?: Rel<DocumentChunk>;

  /** Profile that submitted the feedback (null = anonymous). */
  @ManyToOne(() => UserProfile, {
    nullable: true,
    index: true,
    deleteRule: 'cascade',
  })
  @Index()
  profile?: Rel<UserProfile>;

  /** The query text that produced this chunk — used for future re-ranking. */
  @Property({ type: 'text' })
  queryText!: string;

  /** `true` = thumbs-up, `false` = thumbs-down. */
  @Property()
  isPositive!: boolean;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt: Date = new Date();
}
