FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev --legacy-peer-deps

# ── Model pre-download ────────────────────────────────────────────────────────
# Bakes the ONNX embedding model into the image so Lambda cold starts never
# need internet access (no NAT Gateway required at runtime).
FROM node:20-alpine AS model-download
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY scripts/download-model.cjs ./scripts/download-model.cjs
RUN node scripts/download-model.cjs

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
# Baked-in model cache — loaded by EmbeddingService without any network calls
COPY --from=model-download /app/.cache/huggingface ./.cache/huggingface

EXPOSE 8000
CMD ["node", "dist/main"]
