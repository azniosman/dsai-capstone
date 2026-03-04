/**
 * @file embedding.service.spec.ts
 * @description Unit tests for {@link EmbeddingService}.
 * Mocks `@xenova/transformers` so no model is downloaded during tests.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingService, EMBEDDING_DIM } from './embedding.service';

// ── Mock @xenova/transformers ─────────────────────────────────────────────────

const mockPipelineFn = jest.fn();

jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn().mockResolvedValue(mockPipelineFn),
  env: { cacheDir: '', allowLocalModels: true },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPipelineFn.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingService],
    }).compile();

    service = module.get<EmbeddingService>(EmbeddingService);
  });

  describe('embed()', () => {
    it('returns a 384-dim float array on success', async () => {
      const mockData = new Float32Array(EMBEDDING_DIM).fill(0.1);
      mockPipelineFn.mockResolvedValue({ data: mockData });

      const result = await service.embed('hello world');

      expect(result).toHaveLength(EMBEDDING_DIM);
      expect(result[0]).toBeCloseTo(0.1);
    });

    it('returns an empty array when the pipeline call throws', async () => {
      mockPipelineFn.mockRejectedValue(new Error('ONNX runtime error'));

      const result = await service.embed('hello');

      expect(result).toEqual([]);
    });

    it('caches the pipeline — pipeline() is called only once across multiple embed() calls', async () => {
      const mockData = new Float32Array(EMBEDDING_DIM).fill(0.2);
      mockPipelineFn.mockResolvedValue({ data: mockData });

      await service.embed('first call');
      await service.embed('second call');
      await service.embed('third call');

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { pipeline } = require('@xenova/transformers');
      expect(pipeline).toHaveBeenCalledTimes(1);
    });

    it('serialises concurrent embed() calls — model loaded exactly once', async () => {
      const mockData = new Float32Array(EMBEDDING_DIM).fill(0.3);
      mockPipelineFn.mockResolvedValue({ data: mockData });

      // Fire 5 concurrent embeds before the pipeline is ready
      const results = await Promise.all(
        ['a', 'b', 'c', 'd', 'e'].map((t) => service.embed(t)),
      );

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { pipeline } = require('@xenova/transformers');
      expect(pipeline).toHaveBeenCalledTimes(1);
      for (const r of results) {
        expect(r).toHaveLength(EMBEDDING_DIM);
      }
    });
  });

  describe('isReady()', () => {
    it('returns false before any embed() call', () => {
      expect(service.isReady()).toBe(false);
    });

    it('returns true after a successful embed() call', async () => {
      mockPipelineFn.mockResolvedValue({
        data: new Float32Array(EMBEDDING_DIM).fill(0.1),
      });

      await service.embed('warm up');

      expect(service.isReady()).toBe(true);
    });
  });
});
