/**
 * @file embedding.service.ts
 * @description Generates 384-dim sentence embeddings using
 * `all-MiniLM-L6-v2` via `@xenova/transformers` (ONNX, runs in-process).
 *
 * The pipeline is loaded lazily on the first `embed()` call and cached for
 * the lifetime of the process (warm invocations pay zero init cost).
 *
 * Lambda considerations:
 * - Set `TRANSFORMERS_CACHE=/tmp/.transformers_cache` — the only writable
 *   directory in Lambda.
 * - The quantized model is ~23 MB; first cold-start downloads it from
 *   HuggingFace Hub and caches it in `/tmp`.  Subsequent warm invocations
 *   load the cached files in < 200 ms.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * ONNX model identifier on HuggingFace Hub.
 * Configurable via `EMBEDDING_MODEL` env var (Phase 5).
 * Supported values (both 384-dim, drop-in compatible):
 *   `Xenova/all-MiniLM-L6-v2`  — default, fast, ~23 MB quantized
 *   `Xenova/all-MiniLM-L12-v2` — higher quality, ~33 MB quantized
 */
const MODEL_ID = process.env.EMBEDDING_MODEL ?? 'Xenova/all-MiniLM-L6-v2';

/** Expected output dimensions for this model. */
export const EMBEDDING_DIM = 384;

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  /** Cached pipeline instance (set on first successful init). */
  private pipeline: ((...args: any[]) => Promise<any>) | null = null;

  /** Ongoing init promise — prevents parallel model downloads on concurrent requests. */
  private pipelineInit: Promise<
    ((...args: any[]) => Promise<any>) | null
  > | null = null;

  /**
   * Generates a 384-dim embedding for `text`.
   *
   * @param text - The input string to embed (truncated to 512 tokens by the model).
   * @returns Float array of length 384, or an empty array if the model is unavailable.
   */
  async embed(text: string): Promise<number[]> {
    const pipe = await this.getPipeline();
    if (!pipe) return [];

    try {
      const output = await pipe(text.trim().slice(0, 8192), {
        pooling: 'mean',
        normalize: true,
      });
      return Array.from(output.data);
    } catch (err) {
      this.logger.warn(
        `Embedding generation failed: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Returns the cached pipeline, initialising it on first call.
   * Returns `null` (not throws) if the model cannot be loaded so callers
   * can degrade gracefully (store chunk without embedding).
   */
  async getPipeline(): Promise<((...args: any[]) => Promise<any>) | null> {
    if (this.pipeline) return this.pipeline;
    if (this.pipelineInit) return this.pipelineInit;

    this.pipelineInit = (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const transformers = require('@xenova/transformers');
        const { pipeline, env } = transformers;

        // Redirect model cache for Lambda /tmp or local .cache
        env.cacheDir =
          process.env.TRANSFORMERS_CACHE ??
          `${process.cwd()}/.cache/huggingface`;

        // Suppress verbose download progress in production
        env.allowLocalModels = true;

        this.logger.log(`Loading embedding model ${MODEL_ID}…`);
        const start = Date.now();

        this.pipeline = await pipeline('feature-extraction', MODEL_ID, {
          quantized: true,
        });

        this.logger.log(`Embedding model ready (${Date.now() - start} ms)`);
        return this.pipeline;
      } catch (err) {
        this.pipelineInit = null; // Allow retry on next call
        this.logger.error(
          `Failed to load embedding model: ${(err as Error).message}`,
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
