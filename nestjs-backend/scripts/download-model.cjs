/**
 * Pre-downloads the embedding model into the Docker image at build time.
 * Run during `docker build` so Lambda cold starts never need internet access.
 *
 * Usage (from nestjs-backend/):
 *   node scripts/download-model.cjs
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { pipeline, env } = require('@xenova/transformers');

const MODEL = process.env.EMBEDDING_MODEL ?? 'Xenova/bge-small-en-v1.5';
const CACHE = process.env.TRANSFORMERS_CACHE ?? '/app/.cache/huggingface';

env.cacheDir = CACHE;
env.allowLocalModels = true;
env.allowRemoteModels = true;

(async () => {
  console.log(`[model-download] Downloading ${MODEL} → ${CACHE} …`);
  const start = Date.now();
  await pipeline('feature-extraction', MODEL, { quantized: true });
  console.log(`[model-download] Done in ${Date.now() - start} ms`);
  process.exit(0);
})().catch((err) => {
  console.error('[model-download] Failed:', err.message);
  process.exit(1);
});
