# ── Alpine deps: used only by the TypeScript compiler stage ──────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ── Glibc deps: used by model-download and runner ────────────────────────────
# native addons (onnxruntime-node, sharp) must be compiled on the same libc
# as the stage that runs them. node:20-slim uses glibc; Alpine uses musl —
# mixing them causes immediate segfaults or "cannot find module" errors.
FROM node:20-slim AS deps-glibc
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps && npm prune --omit=dev --legacy-peer-deps

# ── TypeScript compiler ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── Model pre-download ────────────────────────────────────────────────────────
# Bakes the ONNX embedding model into the image so Lambda cold starts never
# need internet access (no NAT Gateway required at runtime).
FROM node:20-slim AS model-download
WORKDIR /app
COPY --from=deps-glibc /app/node_modules ./node_modules
COPY scripts/download-model.cjs ./scripts/download-model.cjs
RUN node scripts/download-model.cjs

# ── Production runner ─────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=deps-glibc /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Baked-in model cache — loaded by EmbeddingService without any network calls
COPY --from=model-download /app/.cache/huggingface ./.cache/huggingface

EXPOSE 8000
CMD ["node", "dist/main"]
