# SkillBridge — RAG (Retrieval-Augmented Generation) Workflow

SkillBridge implements a sophisticated **Hybrid RAG** pipeline to provide context-aware career guidance. This document outlines the ingestion, retrieval, and generation phases of the system.

## 1. Architectural Overview

The RAG system is built on a **Serverless Hybrid Search** architecture, combining dense vector embeddings with sparse keyword search results merged via **Reciprocal Rank Fusion (RRF)**.

### Core Stack
- **Vector Database**: PostgreSQL 16 + `pgvector` (HNSW index).
- **Embedding Model**: `Xenova/all-MiniLM-L6-v2` (384-dim, ONNX runtime, in-process).
- **Keyword Search**: PostgreSQL `tsvector` + GIN index.
- **Re-ranking**: Optional Cross-Encoder (`ms-marco-MiniLM-L-6-v2`).
- **Orchestration**: NestJS `RagService` + `IntelligenceService`.

---

## 2. Data Ingestion (The Ingestion Pipeline)

When a user uploads a resume (PDF/DOCX), the following process occurs:

1.  **Extraction**: `pdf-parse` or `mammoth` extracts raw text.
2.  **Chunking**: `RagService.splitText()` breaks text into **1,500-character overlapping chunks** (200-char overlap).
3.  **Deduplication**: A SHA-256 hash of the content is checked. Chunks already present for the user are skipped (idempotent).
4.  **Vectorization**: `EmbeddingService.embed()` generates a 384-dimensional vector.
5.  **Storage**: Chunks are stored in the `document_chunk` table with the embedding, content hash, and tenant/profile metadata.

---

## 3. Retrieval Pipeline (Hybrid Search)

SkillBridge uses a "Single-Trip Hybrid Search" via a complex SQL CTE (Common Table Expression).

### Step-by-Step Retrieval
1.  **Query Vectorization**: The user's query is embedded into a 384-dim vector.
2.  **Semantic Search (Dense)**: pgvector finds chunks using **Cosine Similarity** (`vector_cosine_ops`) via an HNSW index.
3.  **Keyword Search (Sparse)**: Full-text search using `ts_rank` on a generated `tsvector` column via a GIN index.
4.  **RRF Merging**: The two result sets are merged using Reciprocal Rank Fusion ($k=60$):
    $$score_i = \sum_{j \in \{semantic, keyword\}} \frac{1}{k + rank_{i,j}}$$
5.  **Feedback Boost**: For authenticated users, scores are adjusted based on historical thumbs-up/down signals:
    $$rrfScore += \alpha \times \tanh(net\_votes) \quad (\alpha = 0.01)$$
6.  **Re-ranking (Optional)**: If `RERANKER_ENABLED=true`, the top 20 candidates are rescored by a cross-encoder model.

---

## 4. Generation & Augmentation

The retrieval context is injected into the **Career Coach Chat** (`POST /api/chat`) as follows:

1.  **Query Context**: The system extracts the user's last message.
2.  **Retrieval**: `RagService.query()` returns the top 3 relevant chunks.
3.  **Prompt Construction**: Context is formatted and prepended to the system instructions.
    ```text
    Relevant context from your documents:
    [1] (similarity: 0.89) Experienced in Python and SQL...
    [2] (similarity: 0.82) Managed PostgreSQL databases...
    ```
4.  **LLM Dispatch**: The augmented prompt is sent to the **LLM Provider Chain** (Groq → Claude → Gemini).

---

## 5. Failure Modes & Resilience

- **Cold Start/Fresh DB**: If the `search_vector` column is missing, the system automatically degrades to **Semantic-Only** retrieval.
- **Model Failure**: If the embedding model fails to load, chunks are stored without embeddings and backfilled later via an EventBridge automation job.
- **LLM Timeout**: The multi-provider fallback ensures that if one AI provider is down, the request is retried against the next available provider.

---

## 6. Implementation Reference

- **Service**: `nestjs-backend/src/rag/rag.service.ts`
- **Embedding**: `nestjs-backend/src/rag/embedding.service.ts`
- **Controller**: `nestjs-backend/src/rag/rag.controller.ts`
- **Entity**: `nestjs-backend/src/entities/document-chunk.entity.ts`
- **Metrics**: Emitted via CloudWatch EMF (`SkillBridge/RAG` namespace).
