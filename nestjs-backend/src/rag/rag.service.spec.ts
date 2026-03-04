/**
 * @file rag.service.spec.ts
 * @description Unit tests for {@link RagService}.
 * Mocks EmbeddingService and the MikroORM EntityManager so no DB is needed.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import { RagService } from './rag.service';
import { EmbeddingService, EMBEDDING_DIM } from './embedding.service';
import { DocumentChunk } from '@app/entities/document-chunk.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockEmbedding = Array.from({ length: EMBEDDING_DIM }, () => 0.1);

const buildMockEmbeddingService = (): jest.Mocked<EmbeddingService> =>
  ({
    embed: jest.fn().mockResolvedValue(mockEmbedding),
    isReady: jest.fn().mockReturnValue(true),
    getPipeline: jest.fn(),
  }) as unknown as jest.Mocked<EmbeddingService>;

const buildMockRepo = () => ({
  find: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((data) => ({ ...data })),
});

const buildMockEm = () => ({
  persist: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
  getReference: jest.fn().mockImplementation((_cls, id) => ({ id })),
  create: jest.fn().mockImplementation((_cls, data) => ({ ...data })),
  getConnection: jest.fn().mockReturnValue({
    execute: jest.fn().mockResolvedValue([]),
  }),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RagService', () => {
  let service: RagService;
  let embeddingService: jest.Mocked<EmbeddingService>;
  let mockRepo: ReturnType<typeof buildMockRepo>;
  let mockEm: ReturnType<typeof buildMockEm>;

  beforeEach(async () => {
    mockRepo = buildMockRepo();
    mockEm = buildMockEm();
    embeddingService = buildMockEmbeddingService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: getRepositoryToken(DocumentChunk), useValue: mockRepo },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    service = module.get<RagService>(RagService);
  });

  // ── splitText() ────────────────────────────────────────────────────────────

  describe('splitText()', () => {
    it('returns a single chunk for short text', () => {
      const result = RagService.splitText('Hello world');
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('Hello world');
    });

    it('returns multiple chunks for long text', () => {
      const longText = 'A sentence. '.repeat(300); // ~3600 chars
      const result = RagService.splitText(longText);
      expect(result.length).toBeGreaterThan(1);
    });

    it('returns empty array for blank input', () => {
      expect(RagService.splitText('   ')).toEqual([]);
      expect(RagService.splitText('')).toEqual([]);
    });

    it('each chunk is no longer than chunkSize + overhead', () => {
      const longText = 'word '.repeat(2000);
      const chunks = RagService.splitText(longText, 1500, 200);
      for (const c of chunks) {
        expect(c.length).toBeLessThanOrEqual(2000);
      }
    });
  });

  // ── sha256() ───────────────────────────────────────────────────────────────

  describe('sha256()', () => {
    it('returns a 64-char hex string', () => {
      const hash = RagService.sha256('test content');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('is deterministic', () => {
      expect(RagService.sha256('abc')).toBe(RagService.sha256('abc'));
    });

    it('produces different hashes for different inputs', () => {
      expect(RagService.sha256('foo')).not.toBe(RagService.sha256('bar'));
    });
  });

  // ── formatContext() ────────────────────────────────────────────────────────

  describe('formatContext()', () => {
    it('returns empty string when chunks array is empty', () => {
      expect(RagService.formatContext([])).toBe('');
    });

    it('includes chunk content and similarity score', () => {
      const ctx = RagService.formatContext([
        { id: 1, content: 'Python is popular', sourceType: 'resume', chunkIndex: 0, similarity: 0.82 },
      ]);
      expect(ctx).toContain('Python is popular');
      expect(ctx).toContain('0.82');
    });
  });

  // ── storeChunks() ──────────────────────────────────────────────────────────

  describe('storeChunks()', () => {
    const sampleText = 'Python developer with 5 years experience. '.repeat(10);

    it('creates new chunks and calls embed() for each', async () => {
      const result = await service.storeChunks(sampleText, 1, 'resume', 1);

      expect(embeddingService.embed).toHaveBeenCalled();
      expect(mockEm.persist).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.stored).toBeGreaterThan(0);
    });

    it('skips chunks whose hash already exists in the repository', async () => {
      const text = 'Short unique text for testing idempotency.';
      const hash = RagService.sha256(text);

      // Pre-populate "existing" chunks so all are skipped
      mockRepo.find.mockResolvedValue([
        { contentHash: hash } as DocumentChunk,
      ]);

      const result = await service.storeChunks(text, 1, 'resume', 1);

      expect(result.skipped).toBe(1);
      expect(result.stored).toBe(0);
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('stores chunk without embedding when embed() returns empty array', async () => {
      embeddingService.embed.mockResolvedValue([]);

      const result = await service.storeChunks(
        'Some text to chunk.',
        null,
        'jd',
        1,
      );

      expect(result.stored).toBe(1);
      // Chunk should be persisted even without an embedding
      expect(mockEm.persist).toHaveBeenCalled();
    });

    it('returns {stored:0, skipped:0} for blank text', async () => {
      const result = await service.storeChunks('   ', 1, 'resume', 1);
      expect(result).toEqual({ stored: 0, skipped: 0 });
    });
  });

  // ── query() ────────────────────────────────────────────────────────────────

  describe('query()', () => {
    it('calls embed() and executes pgvector SQL', async () => {
      const dbRows = [
        {
          id: 1,
          content: 'Python developer',
          source_type: 'resume',
          chunk_index: 0,
          similarity: 0.75,
        },
      ];
      mockEm.getConnection().execute.mockResolvedValue(dbRows);

      const result = await service.query('Python skills', 1, { topK: 3 });

      expect(embeddingService.embed).toHaveBeenCalledWith('Python skills');
      expect(mockEm.getConnection().execute).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBe(0.75);
      expect(result[0].content).toBe('Python developer');
    });

    it('returns empty array when embed() returns empty (model unavailable)', async () => {
      embeddingService.embed.mockResolvedValue([]);

      const result = await service.query('anything', 1);

      expect(result).toEqual([]);
      expect(mockEm.getConnection().execute).not.toHaveBeenCalled();
    });

    it('passes profileId filter when provided', async () => {
      mockEm.getConnection().execute.mockResolvedValue([]);

      await service.query('test', 1, { profileId: 42 });

      const sqlCall = mockEm.getConnection().execute.mock.calls[0][0] as string;
      expect(sqlCall).toContain('profile_id = 42');
    });
  });

  // ── Hybrid search (RRF) ────────────────────────────────────────────────────

  describe('query() — hybrid RRF ranking', () => {
    it('ranks chunks appearing in both branches above single-branch chunks', async () => {
      // id=2 appears in both semantic (rank 2) and keyword (rank 1) → highest RRF
      const semRows = [
        { id: 1, content: 'sem-only', source_type: 'resume', chunk_index: 0, similarity: 0.9 },
        { id: 2, content: 'both', source_type: 'resume', chunk_index: 1, similarity: 0.7 },
      ];
      const kwRows = [
        { id: 2, content: 'both', source_type: 'resume', chunk_index: 1 },
        { id: 3, content: 'kw-only', source_type: 'resume', chunk_index: 2 },
      ];

      mockEm.getConnection().execute
        .mockResolvedValueOnce(semRows) // semantic branch
        .mockResolvedValueOnce(kwRows); // keyword branch

      const results = await service.query('test', 1, { topK: 3 });

      // id=2 appears in both → should rank first despite lower semantic similarity
      expect(results[0].id).toBe(2);
      expect(results.map((r) => r.id)).toContain(3); // keyword-only chunk included
    });

    it('includes keyword-only chunks that did not appear in semantic results', async () => {
      const semRows = [
        { id: 1, content: 'sem-only', source_type: 'resume', chunk_index: 0, similarity: 0.8 },
      ];
      const kwRows = [
        { id: 99, content: 'keyword-only chunk', source_type: 'jd', chunk_index: 0 },
      ];

      mockEm.getConnection().execute
        .mockResolvedValueOnce(semRows)
        .mockResolvedValueOnce(kwRows);

      const results = await service.query('test', 1, { topK: 5 });

      expect(results.some((r) => r.id === 99)).toBe(true);
      expect(results.find((r) => r.id === 99)?.content).toBe('keyword-only chunk');
    });

    it('returns semantic-only results when keyword branch throws', async () => {
      const semRows = [
        { id: 1, content: 'fallback', source_type: 'resume', chunk_index: 0, similarity: 0.75 },
      ];

      mockEm.getConnection().execute
        .mockResolvedValueOnce(semRows)                          // semantic OK
        .mockRejectedValueOnce(new Error('column does not exist')); // keyword fails

      const results = await service.query('test', 1, { topK: 3 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
      expect(results[0].content).toBe('fallback');
    });

    it('respects topK limit after RRF merge', async () => {
      const semRows = Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        content: `chunk ${i}`,
        source_type: 'resume',
        chunk_index: i,
        similarity: 0.9 - i * 0.05,
      }));

      mockEm.getConnection().execute
        .mockResolvedValueOnce(semRows)
        .mockResolvedValueOnce([]); // no keyword results

      const results = await service.query('test', 1, { topK: 3 });
      expect(results).toHaveLength(3);
    });
  });

  // ── Feedback-weighted re-ranking (Phase 5) ────────────────────────────────

  describe('query() — feedback-weighted re-ranking', () => {
    it('promotes a chunk with net-positive feedback above a higher-RRF chunk', async () => {
      // id=1 (semRank 1, higher RRF) vs id=2 (semRank 2, has positive feedback)
      const semRows = [
        { id: 1, content: 'no feedback', source_type: 'resume', chunk_index: 0, similarity: 0.9 },
        { id: 2, content: 'thumbs up', source_type: 'resume', chunk_index: 1, similarity: 0.8 },
      ];

      mockEm.getConnection().execute
        .mockResolvedValueOnce(semRows) // semantic
        .mockResolvedValueOnce([])      // keyword
        .mockResolvedValueOnce([{ chunk_id: 2, net_score: 3 }]); // feedback: id=2 boosted

      const results = await service.query('test', 1, { topK: 2, profileId: 42 });

      // id=2 should rank first despite lower semantic similarity
      expect(results[0].id).toBe(2);
    });

    it('demotes a chunk with net-negative feedback below a lower-RRF chunk', async () => {
      // id=2 starts at semRank 1 (highest similarity) but has negative feedback
      const semRows = [
        { id: 2, content: 'thumbs down', source_type: 'resume', chunk_index: 0, similarity: 0.9 },
        { id: 1, content: 'no feedback', source_type: 'resume', chunk_index: 1, similarity: 0.7 },
      ];

      mockEm.getConnection().execute
        .mockResolvedValueOnce(semRows)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ chunk_id: 2, net_score: -3 }]); // id=2 penalised

      const results = await service.query('test', 1, { topK: 2, profileId: 42 });

      // id=1 should rank first after id=2 is demoted
      expect(results[0].id).toBe(1);
    });

    it('does not issue a feedback query when profileId is absent', async () => {
      mockEm.getConnection().execute.mockResolvedValue([]);

      await service.query('test', 1, { topK: 3 }); // no profileId

      const callSQLs = (mockEm.getConnection().execute.mock.calls as [string, ...unknown[]][]).map(
        (c) => c[0],
      );
      expect(callSQLs.some((sql) => sql.includes('rag_feedback'))).toBe(false);
    });

    it('returns correct results when the feedback query throws', async () => {
      const semRows = [
        { id: 1, content: 'ok chunk', source_type: 'resume', chunk_index: 0, similarity: 0.8 },
      ];

      mockEm.getConnection().execute
        .mockResolvedValueOnce(semRows)
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error('relation "rag_feedback" does not exist'));

      const results = await service.query('test', 1, { topK: 3, profileId: 42 });

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe(1);
    });
  });

  // ── recordFeedback() ───────────────────────────────────────────────────────

  describe('recordFeedback()', () => {
    it('persists a positive feedback entry and flushes', async () => {
      await service.recordFeedback(1, 'Python skills', true, 42);

      expect(mockEm.create).toHaveBeenCalled();
      expect(mockEm.persist).toHaveBeenCalled();
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('persists anonymous (null profile) feedback', async () => {
      await service.recordFeedback(5, 'React hooks', false, null);

      const createCall = mockEm.create.mock.calls[0][1] as Record<string, unknown>;
      expect(createCall.profile).toBeUndefined();
      expect(createCall.isPositive).toBe(false);
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ── EMF metrics ────────────────────────────────────────────────────────────

  describe('query() — EMF metric emission', () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
    });

    it('emits a valid EMF line with RagQueryLatencyMs and RagChunksReturned', async () => {
      mockEm.getConnection().execute.mockResolvedValue([
        {
          id: 1,
          content: 'Python developer',
          source_type: 'resume',
          chunk_index: 0,
          similarity: 0.82,
        },
      ]);

      await service.query('Python skills', 1, { topK: 3 });

      const calls = writeSpy.mock.calls.map((c) => c[0] as string);
      const emfLine = calls.find((l) => l.includes('RagQueryLatencyMs'));

      expect(emfLine).toBeDefined();
      const parsed = JSON.parse(emfLine!.trim()) as Record<string, unknown>;

      // EMF envelope
      const aws = parsed._aws as {
        CloudWatchMetrics: Array<{ Namespace: string; Dimensions: string[][]; Metrics: Array<{ Name: string; Unit: string }> }>;
      };
      expect(aws.CloudWatchMetrics[0].Namespace).toBe('SkillBridge/RAG');

      // Metric values
      expect(parsed['RagChunksReturned']).toBe(1);
      expect(typeof parsed['RagQueryLatencyMs']).toBe('number');
      expect(typeof parsed['RagSimilarityMax']).toBe('number');
      expect(typeof parsed['RagSimilarityMean']).toBe('number');
    });

    it('emits zero-chunk metrics on the embed-unavailable early-exit path', async () => {
      embeddingService.embed.mockResolvedValue([]);

      await service.query('anything', 1);

      const calls = writeSpy.mock.calls.map((c) => c[0] as string);
      const emfLine = calls.find((l) => l.includes('RagChunksReturned'));

      expect(emfLine).toBeDefined();
      const parsed = JSON.parse(emfLine!.trim()) as Record<string, unknown>;
      expect(parsed['RagChunksReturned']).toBe(0);
      expect(parsed['RagSimilarityMax']).toBe(0);
    });
  });

  // ── backfill() ─────────────────────────────────────────────────────────────

  describe('backfill()', () => {
    it('re-embeds chunks with null embeddings', async () => {
      const nullChunks = [
        { id: 1, content: 'chunk one', embedding: null } as unknown as DocumentChunk,
        { id: 2, content: 'chunk two', embedding: null } as unknown as DocumentChunk,
      ];
      mockRepo.find.mockResolvedValue(nullChunks);

      const result = await service.backfill(10);

      expect(embeddingService.embed).toHaveBeenCalledTimes(2);
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result.processed).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('counts embed() failures as errors and continues processing', async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, content: 'good chunk', embedding: null } as unknown as DocumentChunk,
        { id: 2, content: 'bad chunk', embedding: null } as unknown as DocumentChunk,
      ]);

      embeddingService.embed
        .mockResolvedValueOnce(mockEmbedding) // id=1 succeeds
        .mockRejectedValueOnce(new Error('model error')); // id=2 fails

      const result = await service.backfill(10);

      expect(result.processed).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('returns {processed:0, errors:0} when no null-embedding chunks exist', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.backfill(100);

      expect(result).toEqual({ processed: 0, errors: 0 });
      expect(mockEm.flush).not.toHaveBeenCalled();
    });
  });
});
