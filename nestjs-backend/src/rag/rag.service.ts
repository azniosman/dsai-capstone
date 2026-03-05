/**
 * @file rag.service.ts
 * @description Core RAG (Retrieval-Augmented Generation) service.
 *
 * Responsibilities:
 *   1. **Ingestion**  — `storeChunks()`: split raw text into overlapping
 *      chunks, hash each for idempotency, embed, and persist via pgvector.
 *   2. **Retrieval**  — `query()`: hybrid semantic + keyword search with
 *      Reciprocal Rank Fusion (RRF) and optional cross-encoder re-ranking.
 *   3. **Backfill**   — `backfill()`: re-embed NULL-embedding rows.
 *   4. **Feedback**   — `recordFeedback()`: persist thumbs-up/down signals.
 *
 * ### Hybrid Search (Phase 6 — single-trip CTE)
 * `query()` executes one SQL CTE that combines pgvector HNSW and tsvector GIN
 * branches via FULL OUTER JOIN, merging with Reciprocal Rank Fusion (k = 60).
 * One DB round trip instead of the two concurrent queries used in Phase 5.
 *
 * If the hybrid CTE fails (e.g. `search_vector` column absent on a fresh DB),
 * the service falls back to semantic-only retrieval automatically.
 *
 * ### Cross-Encoder Re-ranking (Phase 6)
 * After RRF merge and feedback boost, `CrossEncoderService.rerank()` scores
 * the top-N candidates using `ms-marco-MiniLM-L-6-v2`.  Disabled by default
 * (`RERANKER_ENABLED=true` to activate) and non-fatal.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { createHash } from 'crypto';
import {
  DocumentChunk,
  ChunkSourceType,
} from '@app/entities/document-chunk.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { Tenant } from '@app/entities/tenant.entity';
import { RagFeedback } from '@app/entities/rag-feedback.entity';
import { emitEMF } from '@app/common/utils/metrics.util';
import { LogBusService } from '@app/common/log-bus.service';
import { EmbeddingService } from './embedding.service';
import { CrossEncoderService } from './cross-encoder.service';

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

/**
 * Internal row shape returned by `cteHybridQuery` and `semanticOnlyQuery`.
 * Both methods normalise to this interface before merging / sorting.
 */
interface HybridRow {
  id: number;
  content: string;
  source_type: string;
  chunk_index: number;
  similarity: number;
  /** Mutable RRF score — adjusted in-place by `applyFeedbackBoost`. */
  rrfScore: number;
}

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @InjectRepository(DocumentChunk)
    private readonly chunkRepository: EntityRepository<DocumentChunk>,
    private readonly em: EntityManager,
    private readonly embeddingService: EmbeddingService,
    private readonly crossEncoderService: CrossEncoderService,
    private readonly logBus: LogBusService,
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

    this.logBus.emit({
      type: 'RAG',
      component: 'RagService',
      message: `Ingestion started: ${chunks.length} chunks from source=${sourceType}`,
      meta: { profileId: profileId ?? 'anon', sourceType, chunkCount: chunks.length },
    });

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

      this.logBus.emit({
        type: 'RAG',
        component: 'EmbeddingService',
        message: `Embedding generated for chunk ${i} (profile=${profileId ?? 'anon'})`,
        meta: { chunkIndex: i, dims: embedding.length },
      });

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
      this.logBus.emit({
        type: 'RAG',
        component: 'RagService',
        message: `Vector DB write: stored=${stored} skipped=${skipped} (profile=${profileId ?? 'anon'})`,
        meta: { stored, skipped, sourceType },
      });
    }

    return { stored, skipped };
  }

  // ─── Retrieval ─────────────────────────────────────────────────────────────

  /**
   * Hybrid semantic + keyword search with Reciprocal Rank Fusion and optional
   * cross-encoder re-ranking.
   *
   * Executes a single SQL CTE combining pgvector HNSW and tsvector GIN via
   * FULL OUTER JOIN (Phase 6).  Falls back to semantic-only on CTE failure
   * (e.g. `search_vector` column absent on a fresh DB).
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

    this.logBus.emit({
      type: 'RAG',
      component: 'RagService',
      message: `Hybrid RAG query started (tenant=${tenantId} topK=${topK})`,
      meta: { tenantId, topK, threshold, profileId: profileId ?? 'anon' },
    });

    const queryEmbedding = await this.embeddingService.embed(queryText);
    if (queryEmbedding.length === 0) {
      this.logger.warn('RAG query skipped — embedding service unavailable');
      this.logBus.emit({
        type: 'WARN',
        component: 'EmbeddingService',
        message: 'RAG query skipped — embedding service unavailable',
      });
      this.emitQueryMetrics(Date.now() - t0, []);
      return [];
    }

    const results = await this.hybridQuery(
      queryText,
      queryEmbedding,
      tenantId,
      {
        topK,
        threshold,
        profileId,
      },
    );

    const latencyMs = Date.now() - t0;
    this.emitQueryMetrics(latencyMs, results);

    this.logger.log(
      `RAG query returned ${results.length} chunks (tenant=${tenantId} topK=${topK} threshold=${threshold} latencyMs=${latencyMs})`,
    );

    this.logBus.emit({
      type: 'RAG',
      component: 'RagService',
      message: `Hybrid RAG query complete: ${results.length} chunks returned (${latencyMs}ms)`,
      meta: { chunks: results.length, latencyMs, topK, threshold },
    });

    return results;
  }

  /**
   * Orchestrates the full retrieval pipeline:
   *
   *   1. **CTE hybrid query** — single SQL round trip (Phase 6); falls back
   *      to semantic-only if the CTE fails.
   *   2. **Feedback boost** — adjusts RRF scores in-place for authenticated
   *      users based on stored `rag_feedback` signals (Phase 5).
   *   3. **Cross-encoder re-ranking** — optional; rescores top-N candidates
   *      with `ms-marco-MiniLM-L-6-v2` (Phase 6, off by default).
   */
  private async hybridQuery(
    queryText: string,
    queryEmbedding: number[],
    tenantId: number,
    opts: Required<Pick<QueryOptions, 'topK' | 'threshold'>> & {
      profileId?: number;
    },
  ): Promise<RetrievedChunk[]> {
    const { topK, threshold, profileId } = opts;

    // ── 1. Retrieve candidates (CTE → semantic fallback) ─────────────────────
    let scored: HybridRow[];
    try {
      scored = await this.cteHybridQuery(
        queryText,
        queryEmbedding,
        tenantId,
        topK,
        threshold,
        profileId,
      );
    } catch (err) {
      this.logger.debug(
        `Hybrid CTE unavailable — degrading to semantic-only: ${(err as Error).message}`,
      );
      this.logBus.emit({
        type: 'WARN',
        component: 'RagService',
        message: `Hybrid CTE failed — fallback to semantic-only search: ${(err as Error).message}`,
      });
      scored = await this.semanticOnlyQuery(
        queryEmbedding,
        tenantId,
        topK,
        threshold,
        profileId,
      );
    }

    // ── 2. Feedback-weighted re-ranking (Phase 5) ─────────────────────────────
    if (profileId) {
      await this.applyFeedbackBoost(scored, profileId);
      scored.sort((a, b) => b.rrfScore - a.rrfScore);
    }

    // ── 3. Convert to output shape and cross-encoder re-rank (Phase 6) ───────
    const preRanked: RetrievedChunk[] = scored.slice(0, topK).map((r) => ({
      id: r.id,
      content: r.content,
      sourceType: r.source_type,
      chunkIndex: r.chunk_index,
      similarity: r.similarity,
    }));

    return this.crossEncoderService.rerank(queryText, preRanked);
  }

  /**
   * Executes a single hybrid CTE combining pgvector HNSW (`semantic` branch)
   * and tsvector GIN (`keyword` branch) via FULL OUTER JOIN, merging with
   * Reciprocal Rank Fusion.
   *
   * One DB round trip replaces the Phase 5 `Promise.all([sem, kw])` approach.
   *
   * Throws if the `search_vector` column is absent — callers should catch
   * and fall back to `semanticOnlyQuery()`.
   */
  private async cteHybridQuery(
    queryText: string,
    queryEmbedding: number[],
    tenantId: number,
    topK: number,
    threshold: number,
    profileId: number | undefined,
  ): Promise<HybridRow[]> {
    const profileFilter = profileId ? `AND dc.profile_id = ${profileId}` : '';
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    const overFetch = topK * 3;

    type CteRow = {
      id: number;
      content: string;
      source_type: string;
      chunk_index: number;
      similarity: number;
      rrf_score: number;
    };

    const rows: CteRow[] = await this.em.getConnection().execute(
      `
      WITH
        semantic AS (
          SELECT
            dc.id,
            dc.content,
            dc.source_type,
            dc.chunk_index,
            (1 - (dc.embedding <=> $1::vector))::float  AS similarity,
            ROW_NUMBER() OVER (ORDER BY dc.embedding <=> $1::vector) AS sem_rank
          FROM document_chunk dc
          WHERE dc.tenant_id = $2
            AND dc.embedding IS NOT NULL
            AND (1 - (dc.embedding <=> $1::vector)) >= $3
            ${profileFilter}
          LIMIT $4
        ),
        keyword AS (
          SELECT
            dc.id,
            dc.content,
            dc.source_type,
            dc.chunk_index,
            ROW_NUMBER() OVER (
              ORDER BY ts_rank(dc.search_vector, plainto_tsquery('english', $5)) DESC
            ) AS kw_rank
          FROM document_chunk dc
          WHERE dc.tenant_id = $2
            AND dc.search_vector @@ plainto_tsquery('english', $5)
            ${profileFilter}
          LIMIT $4
        ),
        rrf AS (
          SELECT
            COALESCE(s.id,          k.id)          AS id,
            COALESCE(s.content,     k.content)     AS content,
            COALESCE(s.source_type, k.source_type) AS source_type,
            COALESCE(s.chunk_index, k.chunk_index) AS chunk_index,
            COALESCE(s.similarity,  0.0)::float    AS similarity,
            (
              COALESCE(1.0 / ($6::float + s.sem_rank::float), 0.0) +
              COALESCE(1.0 / ($6::float + k.kw_rank::float), 0.0)
            )::float AS rrf_score
          FROM      semantic s
          FULL OUTER JOIN keyword k ON s.id = k.id
        )
      SELECT id, content, source_type, chunk_index, similarity, rrf_score
      FROM   rrf
      ORDER  BY rrf_score DESC
      LIMIT  $7
      `,
      [
        vectorLiteral,
        tenantId,
        threshold,
        overFetch,
        queryText,
        RRF_K,
        overFetch,
      ],
    );

    return rows.map((r) => ({ ...r, rrfScore: r.rrf_score }));
  }

  /**
   * Semantic-only fallback used when the hybrid CTE is unavailable.
   * Runs the pgvector cosine query and synthesises an RRF score from rank.
   */
  private async semanticOnlyQuery(
    queryEmbedding: number[],
    tenantId: number,
    topK: number,
    threshold: number,
    profileId: number | undefined,
  ): Promise<HybridRow[]> {
    const profileFilter = profileId ? `AND dc.profile_id = ${profileId}` : '';
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    const overFetch = topK * 3;

    type SemRow = {
      id: number;
      content: string;
      source_type: string;
      chunk_index: number;
      similarity: number;
    };

    const rows: SemRow[] = await this.em.getConnection().execute(
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

    return rows.map((r, i) => ({ ...r, rrfScore: 1 / (RRF_K + (i + 1)) }));
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
    results: HybridRow[],
    profileId: number,
  ): Promise<void> {
    if (results.length === 0) return;

    const ALPHA = 0.01;
    const chunkIds = results.map((r) => r.id);

    try {
      const rows: Array<{ chunk_id: number; net_score: number }> = await this.em
        .getConnection()
        .execute(
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

      const feedbackMap = new Map(
        rows.map((r) => [r.chunk_id, Number(r.net_score)]),
      );

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
    this.logger.log(
      `Backfill complete: processed=${processed} errors=${errors}`,
    );
    this.logBus.emit({
      type: 'RAG',
      component: 'RagService',
      message: `Embedding backfill complete: processed=${processed} errors=${errors}`,
      meta: { processed, errors },
    });
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
    try {
      const feedback = this.em.create(RagFeedback, {
        chunk: this.em.getReference(DocumentChunk, chunkId),
        profile: profileId
          ? this.em.getReference(UserProfile, profileId)
          : undefined,
        queryText,
        isPositive,
        createdAt: new Date(),
      });
      this.em.persist(feedback);
      await this.em.flush();
    } catch (err) {
      // Non-fatal — table may not exist yet on a fresh DB (updateSchema runs
      // on cold start; feedback degrades gracefully until next restart).
      this.logger.warn(
        'recordFeedback skipped',
        (err as Error).message,
      );
    }
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
      (c, i) =>
        `[${i + 1}] (similarity: ${c.similarity.toFixed(2)})\n${c.content}`,
    );
    return `\n\nRelevant context from your documents:\n${lines.join('\n\n')}`;
  }
}
