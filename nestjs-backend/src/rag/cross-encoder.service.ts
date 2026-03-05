/**
 * @file cross-encoder.service.ts
 * @description Optional cross-encoder re-ranker for RAG results (Phase 6).
 *
 * Uses `Xenova/ms-marco-MiniLM-L-6-v2` via `@xenova/transformers` (ONNX,
 * runs in-process) to score (query, passage) pairs and re-order the top-N
 * RRF candidates by relevance.
 *
 * **Disabled by default** — set `RERANKER_ENABLED=true` to activate.
 * Non-fatal: if the model cannot load or scoring fails, the original
 * RRF order is preserved.
 *
 * Lambda considerations:
 * - Set `TRANSFORMERS_CACHE=/tmp/.transformers_cache` — the only writable
 *   directory in Lambda.
 * - The quantized model is ~22 MB; first cold-start downloads and caches it.
 *   Subsequent warm invocations load from cache in < 300 ms.
 */

import { Injectable, Logger } from '@nestjs/common';
import { RetrievedChunk } from './rag.service';

const DEFAULT_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2';
const DEFAULT_TOP_N = 20;

@Injectable()
export class CrossEncoderService {
  private readonly logger = new Logger(CrossEncoderService.name);

  /** Cached pipeline — loaded once per process lifetime. */
  private pipeline: ((...args: unknown[]) => Promise<unknown>) | null = null;

  /** Deduplicated init promise — prevents concurrent model downloads. */
  private pipelineInit: Promise<
    ((...args: unknown[]) => Promise<unknown>) | null
  > | null = null;

  private readonly modelId = process.env.RERANKER_MODEL ?? DEFAULT_MODEL;
  private readonly enabled = process.env.RERANKER_ENABLED === 'true';
  private readonly topN = parseInt(
    process.env.RERANKER_TOP_N ?? String(DEFAULT_TOP_N),
    10,
  );

  /**
   * Re-ranks `candidates` by cross-encoder relevance score for `query`.
   *
   * Only the top-`RERANKER_TOP_N` candidates are scored (one inference call
   * each). Candidates beyond `topN` are appended unchanged after the ranked
   * set.
   *
   * Returns the original order when:
   *   - `RERANKER_ENABLED` is not `'true'`
   *   - The model has not loaded (pipeline unavailable)
   *   - Scoring throws (non-fatal degradation)
   */
  async rerank(
    query: string,
    candidates: RetrievedChunk[],
  ): Promise<RetrievedChunk[]> {
    if (!this.enabled || candidates.length === 0) return candidates;

    const pipe = await this.getPipeline();
    if (!pipe) return candidates;

    const toScore = candidates.slice(0, this.topN);
    const remainder = candidates.slice(this.topN);

    try {
      const scores = await Promise.all(
        toScore.map(async (chunk): Promise<number> => {
          const result = await pipe(query, { text_pair: chunk.content });
          const entry = (Array.isArray(result) ? result[0] : result) as
            | { score?: number }
            | undefined;
          return typeof entry?.score === 'number' ? entry.score : 0;
        }),
      );

      const ranked = toScore
        .map((chunk, i) => ({ chunk, score: scores[i] }))
        .sort((a, b) => b.score - a.score)
        .map(({ chunk }) => chunk);

      return [...ranked, ...remainder];
    } catch (err) {
      this.logger.warn(
        `Cross-encoder reranking failed — preserving RRF order: ${(err as Error).message}`,
      );
      return candidates;
    }
  }

  /**
   * Returns the cached pipeline, initialising it on first call.
   * Returns `null` if the model cannot be loaded — callers degrade gracefully.
   */
  async getPipeline(): Promise<
    ((...args: unknown[]) => Promise<unknown>) | null
  > {
    if (this.pipeline) return this.pipeline;
    if (this.pipelineInit) return this.pipelineInit;

    this.pipelineInit = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { pipeline, env } = require('@xenova/transformers') as {
          pipeline: (...args: unknown[]) => Promise<unknown>;
          env: { cacheDir: string; allowLocalModels: boolean };
        };

        env.cacheDir =
          process.env.TRANSFORMERS_CACHE ??
          `${process.cwd()}/.cache/huggingface`;
        env.allowLocalModels = true;

        this.logger.log(`Loading cross-encoder model ${this.modelId}…`);
        const start = Date.now();

        this.pipeline = (await pipeline('text-classification', this.modelId, {
          quantized: true,
        })) as (...args: unknown[]) => Promise<unknown>;

        this.logger.log(`Cross-encoder model ready (${Date.now() - start} ms)`);
        return this.pipeline;
      } catch (err) {
        this.pipelineInit = null; // allow retry on next call
        this.logger.error(
          `Failed to load cross-encoder model: ${(err as Error).message}`,
        );
        return null;
      }
    })();

    return this.pipelineInit;
  }

  /** Returns true once the pipeline has been loaded successfully. */
  isReady(): boolean {
    return this.pipeline !== null;
  }
}
