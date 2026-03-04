/**
 * @file rag.service.ts
 * @description Core RAG (Retrieval-Augmented Generation) service.
 *
 * Responsibilities:
 *   1. **Ingestion** — `storeChunks()`: split raw text into overlapping
 *      chunks, hash each chunk for idempotency, generate embeddings, and
 *      persist to `document_chunk` via pgvector.
 *   2. **Retrieval** — `query()`: embed a user query and run a pgvector
 *      cosine-similarity search to return the most relevant text chunks.
 *   3. **Backfill** — `backfill()`: re-embed any `document_chunk` rows
 *      that have a NULL embedding (e.g. from before the pipeline existed).
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { createHash } from 'crypto';
import { DocumentChunk, ChunkSourceType } from '@app/entities/document-chunk.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { Tenant } from '@app/entities/tenant.entity';
import { emitEMF } from '@app/common/utils/metrics.util';
import { EmbeddingService } from './embedding.service';

/** A retrieved chunk with its similarity score. */
export interface RetrievedChunk {
  id: number;
  content: string;
  sourceType: string;
  chunkIndex: number;
  similarity: number;
}

/** Options for the `query()` method. */
export interface QueryOptions {
  /** Maximum chunks to return (default: 3). */
  topK?: number;
  /** Minimum cosine similarity to include (0–1, default: 0.5). */
  threshold?: number;
  /** Restrict results to a specific profile's chunks. */
  profileId?: number;
}

/** Result from `storeChunks()`. */
export interface StoreResult {
  stored: number;
  skipped: number;
}

/** Chunk size in characters (~375 tokens for English text). */
const CHUNK_SIZE = 1500;
/** Overlap between consecutive chunks in characters (~50 tokens). */
const CHUNK_OVERLAP = 200;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: EntityRepository<DocumentChunk>,
    private readonly em: EntityManager,
    private readonly embeddingService: EmbeddingService,
  ) {}

  // ─── Ingestion ─────────────────────────────────────────────────────────────

  /**
   * Splits `text` into overlapping chunks, embeds each one, and persists to
   * `document_chunk`.  Chunks whose SHA-256 hash already exists for this
   * profile are skipped (idempotent).
   *
   * @param text       Raw source text (resume, JD, etc.)
   * @param profileId  ID of the UserProfile this text belongs to (nullable).
   * @param sourceType Where the text came from: 'resume' | 'jd' | 'note'.
   * @param tenantId   Tenant for multi-tenancy isolation.
   */
  async storeChunks(
    text: string,
    profileId: number | null,
    sourceType: ChunkSourceType,
    tenantId: number,
  ): Promise<StoreResult> {
    const chunks = RagService.splitText(text);
    if (chunks.length === 0) return { stored: 0, skipped: 0 };

    const hashes = chunks.map((c) => RagService.sha256(c));

    // Find which hashes already exist for this profile to skip re-embedding
    const existing = await this.chunkRepository.find({
      contentHash: { $in: hashes },
      ...(profileId ? { profile: { id: profileId } } : { profile: null }),
    });
    const existingHashes = new Set(existing.map((e) => e.contentHash));

    let stored = 0;
    let skipped = 0;

    for (let i = 0; i < chunks.length; i++) {
      const hash = hashes[i];
      if (existingHashes.has(hash)) {
        skipped++;
        continue;
      }

      const embedding = await this.embeddingService.embed(chunks[i]);

      const chunk = this.chunkRepository.create({
        content: chunks[i],
        contentHash: hash,
        sourceType,
        chunkIndex: i,
        embedding: embedding.length > 0 ? embedding : undefined,
        profile: profileId
          ? this.em.getReference(UserProfile, profileId)
          : undefined,
        tenant: this.em.getReference(Tenant, tenantId),
      });

      this.em.persist(chunk);
      stored++;
    }

    if (stored > 0) {
      await this.em.flush();
      this.logger.log(
        `Stored ${stored} new chunks (skipped ${skipped}) for profile=${profileId ?? 'anon'} source=${sourceType}`,
      );
    }

    return { stored, skipped };
  }

  // ─── Retrieval ─────────────────────────────────────────────────────────────

  /**
   * Embeds `queryText` and returns the top-K most similar document chunks
   * from pgvector using cosine similarity.
   *
   * @param queryText  The user's question or context string.
   * @param tenantId   Restricts search to this tenant's chunks.
   * @param opts       TopK, threshold, and optional profileId filter.
   */
  async query(
    queryText: string,
    tenantId: number,
    opts: QueryOptions = {},
  ): Promise<RetrievedChunk[]> {
    const { topK = 3, threshold = 0.5, profileId } = opts;
    const t0 = Date.now();

    const queryEmbedding = await this.embeddingService.embed(queryText);
    if (queryEmbedding.length === 0) {
      this.logger.warn('RAG query skipped — embedding service unavailable');
      this.emitQueryMetrics(Date.now() - t0, []);
      return [];
    }

    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    // pgvector <=> is cosine distance; similarity = 1 - distance
    const profileFilter = profileId ? `AND dc.profile_id = ${profileId}` : '';

    const rows: Array<{
      id: number;
      content: string;
      source_type: string;
      chunk_index: number;
      similarity: number;
    }> = await this.em.getConnection().execute(
      `
      SELECT
        dc.id,
        dc.content,
        dc.source_type,
        dc.chunk_index,
        (1 - (dc.embedding <=> $1::vector))::float AS similarity
      FROM document_chunk dc
      WHERE dc.tenant_id = $2
        AND dc.embedding IS NOT NULL
        AND (1 - (dc.embedding <=> $1::vector)) >= $3
        ${profileFilter}
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $4
      `,
      [vectorLiteral, tenantId, threshold, topK],
    );

    const results: RetrievedChunk[] = rows.map((r) => ({
      id: r.id,
      content: r.content,
      sourceType: r.source_type,
      chunkIndex: r.chunk_index ?? 0,
      similarity: parseFloat(String(r.similarity)),
    }));

    const latencyMs = Date.now() - t0;
    this.emitQueryMetrics(latencyMs, results);

    this.logger.log(
      `RAG query returned ${results.length} chunks (tenant=${tenantId} topK=${topK} threshold=${threshold} latencyMs=${latencyMs})`,
    );

    return results;
  }

  /**
   * Emits CloudWatch EMF metrics for a completed `query()` call.
   * Metrics namespace: `SkillBridge/RAG`.
   */
  private emitQueryMetrics(latencyMs: number, chunks: RetrievedChunk[]): void {
    const similarities = chunks.map((c) => c.similarity);
    const maxSim =
      similarities.length > 0 ? Math.max(...similarities) : 0;
    const meanSim =
      similarities.length > 0
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length
        : 0;

    emitEMF('SkillBridge/RAG', { Service: 'RagService' }, [
      { name: 'RagQueryLatencyMs', value: latencyMs, unit: 'Milliseconds' },
      { name: 'RagChunksReturned', value: chunks.length, unit: 'Count' },
      { name: 'RagSimilarityMax', value: maxSim, unit: 'None' },
      { name: 'RagSimilarityMean', value: meanSim, unit: 'None' },
    ]);
  }

  // ─── Backfill ──────────────────────────────────────────────────────────────

  /**
   * Re-embeds `document_chunk` rows that have a NULL embedding.
   * Called by the EventBridge `embedding-backfill` automation Lambda
   * via `POST /internal/embeddings/backfill`.
   *
   * @param limit  Maximum rows to process per invocation (default: 100).
   */
  async backfill(limit = 100): Promise<{ processed: number; errors: number }> {
    const rows = await this.chunkRepository.find(
      { embedding: null },
      { limit, orderBy: { id: 'ASC' } },
    );

    let processed = 0;
    let errors = 0;

    for (const chunk of rows) {
      try {
        const embedding = await this.embeddingService.embed(chunk.content);
        if (embedding.length > 0) {
          chunk.embedding = embedding;
          this.em.persist(chunk);
          processed++;
        }
      } catch (err) {
        this.logger.warn(
          `Backfill failed for chunk id=${chunk.id}: ${(err as Error).message}`,
        );
        errors++;
      }
    }

    if (processed > 0) await this.em.flush();
    this.logger.log(`Backfill complete: processed=${processed} errors=${errors}`);
    return { processed, errors };
  }

  // ─── Static helpers ────────────────────────────────────────────────────────

  /**
   * Splits text into overlapping chunks of roughly `CHUNK_SIZE` characters,
   * preferring sentence boundaries.
   */
  static splitText(
    text: string,
    chunkSize = CHUNK_SIZE,
    overlap = CHUNK_OVERLAP,
  ): string[] {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (normalized.length === 0) return [];
    if (normalized.length <= chunkSize) return [normalized];

    const chunks: string[] = [];
    let start = 0;

    while (start < normalized.length) {
      const end = Math.min(start + chunkSize, normalized.length);
      let chunk = normalized.slice(start, end);

      // Snap to nearest sentence boundary if not at end
      if (end < normalized.length) {
        const boundary = Math.max(
          chunk.lastIndexOf('. '),
          chunk.lastIndexOf('.\n'),
          chunk.lastIndexOf('! '),
          chunk.lastIndexOf('? '),
        );
        if (boundary > chunkSize * 0.5) {
          chunk = chunk.slice(0, boundary + 1);
        }
      }

      if (chunk.trim().length > 50) {
        chunks.push(chunk.trim());
      }

      start += Math.max(chunk.length - overlap, 1);
    }

    return chunks;
  }

  /** SHA-256 hash of text, truncated to 64 hex chars (fits `length: 64` column). */
  static sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex').slice(0, 64);
  }

  /**
   * Formats retrieved chunks into a context block suitable for LLM injection.
   * Returns an empty string when no chunks are available.
   */
  static formatContext(chunks: RetrievedChunk[]): string {
    if (chunks.length === 0) return '';
    const lines = chunks.map(
      (c, i) => `[${i + 1}] (similarity: ${c.similarity.toFixed(2)})\n${c.content}`,
    );
    return `\n\nRelevant context from your documents:\n${lines.join('\n\n')}`;
  }
}
