/**
 * @file embedding.service.ts
 * @description Generates 384-dim sentence embeddings using
 * `bge-small-en-v1.5` via `@xenova/transformers` (ONNX, runs in-process).
 *
 * The pipeline is loaded lazily on the first `embed()` call and cached for
 * the lifetime of the process (warm invocations pay zero init cost).
 *
 * Lambda considerations:
 * - The model is baked into the Docker image at /app/.cache/huggingface by
 *   the `model-download` build stage (scripts/download-model.cjs).
 * - No internet access is required at runtime — works without a NAT Gateway.
 * - Override the cache path via TRANSFORMERS_CACHE env var if needed.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * ONNX model identifier on HuggingFace Hub.
 * Configurable via `EMBEDDING_MODEL` env var.
 * Supported values (all 384-dim, drop-in compatible with pgvector column):
 *   `Xenova/bge-small-en-v1.5`  — default, better retrieval quality, ~22 MB quantized
 *   `Xenova/all-MiniLM-L6-v2`   — legacy default, fast, ~23 MB quantized
 *   `Xenova/all-MiniLM-L12-v2`  — higher MiniLM quality, ~33 MB quantized
 */
const MODEL_ID = process.env.EMBEDDING_MODEL ?? 'Xenova/bge-small-en-v1.5';

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

        // Use baked-in model cache (Docker image) or an explicit override.
        // Default is /app/.cache/huggingface where the model-download build
        // stage placed the ONNX files — no internet access needed at runtime.
        env.cacheDir =
          process.env.TRANSFORMERS_CACHE ??
          `${process.cwd()}/.cache/huggingface`;

        env.allowLocalModels = true;
        // In production the model is baked into the image — disable remote
        // downloads so a missing NAT Gateway never causes a silent failure.
        env.allowRemoteModels = process.env.NODE_ENV !== 'production';

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
