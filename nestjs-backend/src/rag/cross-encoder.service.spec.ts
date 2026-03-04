/**
 * @file cross-encoder.service.spec.ts
 * @description Unit tests for {@link CrossEncoderService}.
 * Mocks `@xenova/transformers` so no model is loaded.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CrossEncoderService } from './cross-encoder.service';
import { RetrievedChunk } from './rag.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeChunk = (id: number, content = `chunk ${id}`): RetrievedChunk => ({
  id,
  content,
  sourceType: 'resume',
  chunkIndex: id - 1,
  similarity: 0.8,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CrossEncoderService', () => {
  let service: CrossEncoderService;

  const buildModule = async (): Promise<TestingModule> =>
    Test.createTestingModule({ providers: [CrossEncoderService] }).compile();

  beforeEach(async () => {
    // Ensure RERANKER_ENABLED is not accidentally set from env
    delete process.env.RERANKER_ENABLED;
    delete process.env.RERANKER_MODEL;
    delete process.env.RERANKER_TOP_N;

    const module = await buildModule();
    service = module.get<CrossEncoderService>(CrossEncoderService);
  });

  // ── rerank() — disabled by default ─────────────────────────────────────────

  describe('rerank() — disabled by default', () => {
    it('returns candidates unchanged when RERANKER_ENABLED is not set', async () => {
      const chunks = [makeChunk(1), makeChunk(2), makeChunk(3)];
      const result = await service.rerank('Python skills', chunks);
      expect(result).toBe(chunks); // same reference — not mutated
    });

    it('returns empty array unchanged', async () => {
      const result = await service.rerank('anything', []);
      expect(result).toEqual([]);
    });
  });

  // ── rerank() — pipeline unavailable ────────────────────────────────────────

  describe('rerank() — pipeline unavailable', () => {
    let enabledService: CrossEncoderService;

    beforeEach(async () => {
      // Build service with RERANKER_ENABLED=true so we reach the getPipeline() call
      process.env.RERANKER_ENABLED = 'true';
      const module = await buildModule();
      enabledService = module.get<CrossEncoderService>(CrossEncoderService);
    });

    afterEach(() => {
      delete process.env.RERANKER_ENABLED;
    });

    it('returns candidates unchanged when getPipeline() returns null', async () => {
      jest.spyOn(enabledService, 'getPipeline').mockResolvedValue(null);

      const chunks = [makeChunk(1), makeChunk(2)];
      const result = await enabledService.rerank('test', chunks);

      expect(result).toBe(chunks);
    });
  });

  // ── rerank() — re-ordering ──────────────────────────────────────────────────

  describe('rerank() — re-ordering with mock pipeline', () => {
    let enabledService: CrossEncoderService;

    beforeEach(async () => {
      // Rebuild module with RERANKER_ENABLED=true so enabled flag is true at construction
      process.env.RERANKER_ENABLED = 'true';
      const module = await buildModule();
      enabledService = module.get<CrossEncoderService>(CrossEncoderService);
    });

    afterEach(() => {
      delete process.env.RERANKER_ENABLED;
      delete process.env.RERANKER_TOP_N;
    });

    it('re-orders candidates by cross-encoder score descending', async () => {
      // Scores: chunk1=0.1 (low), chunk2=0.9 (high), chunk3=0.5 (mid)
      const scoreMap: Record<number, number> = { 1: 0.1, 2: 0.9, 3: 0.5 };

      const mockPipeline = jest
        .fn()
        .mockImplementation((_query: string, opts: { text_pair: string }) => {
          const id = parseInt(opts.text_pair.replace('chunk ', ''), 10);
          return Promise.resolve([{ score: scoreMap[id] ?? 0 }]);
        });

      jest.spyOn(enabledService, 'getPipeline').mockResolvedValue(
        mockPipeline as unknown as ReturnType<typeof enabledService.getPipeline> extends Promise<infer T> ? T : never,
      );

      const chunks = [makeChunk(1), makeChunk(2), makeChunk(3)];
      const result = await enabledService.rerank('test query', chunks);

      // Expected order: id=2 (0.9) → id=3 (0.5) → id=1 (0.1)
      expect(result.map((c) => c.id)).toEqual([2, 3, 1]);
    });

    it('preserves candidates beyond topN after the scored set', async () => {
      // Set topN=2; chunk3 is appended unchanged after the scored pair
      process.env.RERANKER_TOP_N = '2';
      const module = await buildModule();
      const svc = module.get<CrossEncoderService>(CrossEncoderService);

      jest
        .spyOn(svc, 'getPipeline')
        .mockResolvedValue(
          jest.fn().mockResolvedValue([{ score: 0.5 }]) as unknown as ReturnType<
            typeof svc.getPipeline
          > extends Promise<infer T>
            ? T
            : never,
        );

      const chunks = [makeChunk(1), makeChunk(2), makeChunk(3)];
      const result = await svc.rerank('test', chunks);

      expect(result[result.length - 1].id).toBe(3);
      expect(result).toHaveLength(3);
    });

    it('returns original order when the pipeline throws', async () => {
      jest.spyOn(enabledService, 'getPipeline').mockResolvedValue(
        jest.fn().mockRejectedValue(new Error('inference error')) as unknown as ReturnType<
          typeof enabledService.getPipeline
        > extends Promise<infer T>
          ? T
          : never,
      );

      const chunks = [makeChunk(1), makeChunk(2)];
      const result = await enabledService.rerank('test', chunks);

      expect(result.map((c) => c.id)).toEqual([1, 2]);
    });
  });

  // ── isReady() ──────────────────────────────────────────────────────────────

  describe('isReady()', () => {
    it('returns false before the pipeline is loaded', () => {
      expect(service.isReady()).toBe(false);
    });
  });
});
