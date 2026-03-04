/**
 * @file rag.service.ts
 * @description Core RAG (Retrieval-Augmented Generation) service.
 *
 * Responsibilities:
 *   1. **Ingestion**  — `storeChunks()`: split raw text into overlapping
 *      chunks, hash each for idempotency, embed, and persist via pgvector.
 *   2. **Retrieval**  — `query()`: hybrid semantic + keyword search with
 *      Reciprocal Rank Fusion (RRF) re-ranking.
 *   3. **Backfill**   — `backfill()`: re-embed NULL-embedding rows.
 *   4. **Feedback**   — `recordFeedback()`: persist thumbs-up/down signals.
 *
 * ### Hybrid Search (Phase 4)
 * `query()` runs two parallel branches and merges with RRF (k = 60):
 *
 *   Semantic branch  — pgvector cosine similarity on `embedding` column
 *   Keyword branch   — PostgreSQL full-text search on `search_vector`
 *                      (tsvector generated column, GIN-indexed)
 *
 * If the keyword branch fails (e.g. `search_vector` column not yet created
 * on a fresh DB), the service gracefully falls back to semantic-only.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { createHash } from 'crypto';
import { DocumentChunk, ChunkSourceType } from '@app/entities/document-chunk.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { Tenant } from '@app/entities/tenant.entity';
import { RagFeedback } from '@app/entities/rag-feedback.entity';
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

/** Standard RRF constant — balances contribution of tail-ranked results. */
const RRF_K = 60;

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
   * Hybrid semantic + keyword search with Reciprocal Rank Fusion.
   *
   * Runs both branches, merges with RRF (k=60), and returns the top-K chunks
   * ranked by combined RRF score.  The keyword branch fails gracefully —
   * if `search_vector` does not exist the method returns semantic results only.
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

    const results = await this.hybridQuery(queryText, queryEmbedding, tenantId, {
      topK,
      threshold,
      profileId,
    });

    const latencyMs = Date.now() - t0;
    this.emitQueryMetrics(latencyMs, results);

    this.logger.log(
      `RAG query returned ${results.length} chunks (tenant=${tenantId} topK=${topK} threshold=${threshold} latencyMs=${latencyMs})`,
    );

    return results;
  }

  /**
   * Runs semantic (pgvector) and keyword (tsvector) branches **concurrently**
   * via `Promise.all`, then merges results using Reciprocal Rank Fusion (RRF).
   *
   * After RRF merge, `applyFeedbackBoost()` adjusts scores for authenticated
   * users based on their stored `rag_feedback` signals (Phase 5).
   *
   * The keyword branch silently returns [] on any error (e.g. `search_vector`
   * column absent on a fresh DB) — semantic-only results flow through unchanged.
   */
  private async hybridQuery(
    queryText: string,
    queryEmbedding: number[],
    tenantId: number,
    opts: Required<Pick<QueryOptions, 'topK' | 'threshold'>> & { profileId?: number },
  ): Promise<RetrievedChunk[]> {
    const { topK, threshold, profileId } = opts;
    const overFetch = topK * 3;
    const profileFilter = profileId ? `AND dc.profile_id = ${profileId}` : '';
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    // ── Semantic + keyword branches run concurrently ──────────────────────────
    type SemRow = { id: number; content: string; source_type: string; chunk_index: number; similarity: number };
    type KwRow  = { id: number; content: string; source_type: string; chunk_index: number };

    const semPromise: Promise<SemRow[]> = this.em.getConnection().execute(
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
      [vectorLiteral, tenantId, threshold, overFetch],
    );

    const kwPromise: Promise<KwRow[]> = (
      this.em.getConnection().execute(
        `
        SELECT
          dc.id,
          dc.content,
          dc.source_type,
          dc.chunk_index
        FROM document_chunk dc
        WHERE dc.tenant_id = $1
          AND dc.search_vector @@ plainto_tsquery('english', $2)
          ${profileFilter}
        ORDER BY ts_rank(dc.search_vector, plainto_tsquery('english', $2)) DESC
        LIMIT $3
        `,
        [tenantId, queryText, overFetch],
      ) as Promise<KwRow[]>
    ).catch((err: Error): KwRow[] => {
      this.logger.debug(
        `Keyword branch unavailable — degrading to semantic-only: ${err.message}`,
      );
      return [];
    });

    const [semRows, kwRows] = await Promise.all([semPromise, kwPromise]);

    // ── Reciprocal Rank Fusion ────────────────────────────────────────────────
    // RRF score = Σ 1 / (k + rank_i) across branches.
    // Chunks appearing in both branches receive a higher combined score.
    const semMap = new Map(semRows.map((r, i) => [r.id, { ...r, semRank: i + 1 }]));
    const kwMap  = new Map(kwRows.map((r, i) => [r.id, { ...r, kwRank: i + 1 }]));
    const allIds = new Set([...semMap.keys(), ...kwMap.keys()]);

    const scored = [...allIds].map((id) => {
      const s = semMap.get(id);
      const k = kwMap.get(id);
      return {
        id,
        content: s?.content ?? k?.content ?? '',
        source_type: s?.source_type ?? k?.source_type ?? 'resume',
        chunk_index: s?.chunk_index ?? k?.chunk_index ?? 0,
        similarity: s?.similarity ?? 0,
        rrfScore:
          (s ? 1 / (RRF_K + s.semRank) : 0) +
          (k ? 1 / (RRF_K + k.kwRank) : 0),
      };
    });

    scored.sort((a, b) => b.rrfScore - a.rrfScore);

    // ── Feedback-weighted re-ranking (Phase 5) ────────────────────────────────
    // Applies a ±α boost per chunk based on net user feedback for this profile.
    if (profileId) {
      await this.applyFeedbackBoost(scored, profileId);
      scored.sort((a, b) => b.rrfScore - a.rrfScore);
    }

    return scored.slice(0, topK).map((r) => ({
      id: r.id,
      content: r.content,
      sourceType: r.source_type,
      chunkIndex: r.chunk_index,
      similarity: r.similarity,
    }));
  }

  /**
   * Adjusts RRF scores in-place using stored feedback signals for `profileId`.
   *
   * Score adjustment: `rrfScore += α × tanh(net_feedback)` where:
   *   - `net_feedback` = (positive votes) − (negative votes) for this chunk + profile
   *   - `α = 0.01` — keeps feedback influence proportional to the RRF range (~0.016–0.033)
   *   - `tanh` normalises: even 10 votes saturates at α, preventing runaway boosts
   *
   * Non-fatal: if `rag_feedback` is unavailable (fresh DB, permission issue, etc.),
   * the original RRF scores are left unchanged and a debug log is emitted.
   */
  private async applyFeedbackBoost(
    results: Array<{ id: number; rrfScore: number }>,
    profileId: number,
  ): Promise<void> {
    if (results.length === 0) return;

    const ALPHA = 0.01;
    const chunkIds = results.map((r) => r.id);

    try {
      const rows: Array<{ chunk_id: number; net_score: number }> =
        await this.em.getConnection().execute(
          `
          SELECT
            chunk_id,
            SUM(CASE WHEN is_positive THEN 1 ELSE -1 END)::int AS net_score
          FROM rag_feedback
          WHERE chunk_id = ANY($1::int[])
            AND profile_id = $2
          GROUP BY chunk_id
          `,
          [chunkIds, profileId],
        );

      if (rows.length === 0) return;

      const feedbackMap = new Map(rows.map((r) => [r.chunk_id, Number(r.net_score)]));

      for (const result of results) {
        const net = feedbackMap.get(result.id) ?? 0;
        if (net !== 0) {
          result.rrfScore += ALPHA * Math.tanh(net);
        }
      }
    } catch (err) {
      this.logger.debug(
        `Feedback boost unavailable — skipping re-rank: ${(err as Error).message}`,
      );
    }
  }

  // ─── Backfill ──────────────────────────────────────────────────────────────

  /**
   * Re-embeds `document_chunk` rows that have a NULL embedding.
   * Called by the EventBridge `embedding-backfill` automation Lambda.
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

  // ─── Feedback ──────────────────────────────────────────────────────────────

  /**
   * Persists a thumbs-up or thumbs-down signal for a retrieved chunk.
   *
   * Signals are stored in `rag_feedback` for future re-ranking (Phase 5).
   * The call is lightweight — one INSERT — and should not throw in the
   * controller's hot path; callers may fire-and-forget with `.catch()`.
   *
   * @param chunkId    ID of the DocumentChunk the user reacted to.
   * @param queryText  The query that surfaced this chunk.
   * @param isPositive `true` = thumbs-up, `false` = thumbs-down.
   * @param profileId  Profile ID, or `null` for anonymous feedback.
   */
  async recordFeedback(
    chunkId: number,
    queryText: string,
    isPositive: boolean,
    profileId: number | null,
  ): Promise<void> {
    const feedback = this.em.create(RagFeedback, {
      chunk: this.em.getReference(DocumentChunk, chunkId),
      profile: profileId ? this.em.getReference(UserProfile, profileId) : undefined,
      queryText,
      isPositive,
      createdAt: new Date(),
    });
    this.em.persist(feedback);
    await this.em.flush();
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Emits CloudWatch EMF metrics for a completed `query()` call.
   * Namespace: `SkillBridge/RAG`.
   */
  private emitQueryMetrics(latencyMs: number, chunks: RetrievedChunk[]): void {
    const similarities = chunks.map((c) => c.similarity);
    const maxSim = similarities.length > 0 ? Math.max(...similarities) : 0;
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
