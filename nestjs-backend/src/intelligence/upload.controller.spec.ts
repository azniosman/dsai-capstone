/**
 * @file upload.controller.spec.ts
 * @description Unit tests for UploadController — covers file validation,
 * resume parsing delegation, and RAG chunk storage (fire-and-forget).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { IntelligenceService } from './intelligence.service';
import { RagService } from '../rag/rag.service';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIntelligenceService = {
  parseResume: jest.fn(),
};

const mockRagService = {
  storeChunks: jest.fn(),
};

// Stub ResumeParser so we don't need real file buffers
jest.mock('../common/utils/resume-parser.util', () => ({
  ResumeParser: {
    extractText: jest.fn().mockResolvedValue('Extracted resume text content.'),
    extractSkills: jest.fn().mockReturnValue(['Python', 'SQL']),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(mimetype = 'application/pdf'): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'resume.pdf',
    encoding: '7bit',
    mimetype,
    buffer: Buffer.from('fake pdf content'),
    size: 1024,
    stream: null as any,
    destination: '',
    filename: 'resume.pdf',
    path: '',
  };
}

function makeRequest(userId?: number) {
  return {
    user: userId ? { id: userId, tenant: { id: 1 } } : null,
  } as any;
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('UploadController', () => {
  let controller: UploadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: IntelligenceService, useValue: mockIntelligenceService },
        { provide: RagService, useValue: mockRagService },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    jest.clearAllMocks();
  });

  it('throws BadRequestException when no file is provided', async () => {
    await expect(
      controller.uploadResume(undefined as any, {}, makeRequest()),
    ).rejects.toThrow(BadRequestException);
  });

  it('calls parseResume with extracted text', async () => {
    const parsed = { name: 'Alice', skills: ['Python'] };
    mockIntelligenceService.parseResume.mockResolvedValue(parsed);
    mockRagService.storeChunks.mockResolvedValue(undefined);

    const result = await controller.uploadResume(
      makeFile(),
      {},
      makeRequest(1),
    );

    expect(mockIntelligenceService.parseResume).toHaveBeenCalledWith(
      'Extracted resume text content.',
    );
    expect(result).toEqual(parsed);
  });

  it('stores RAG chunks asynchronously without blocking response', async () => {
    const parsed = { name: 'Bob', skills: ['SQL'] };
    mockIntelligenceService.parseResume.mockResolvedValue(parsed);

    // storeChunks returns a promise that resolves after response
    let resolveChunks!: () => void;
    mockRagService.storeChunks.mockReturnValue(
      new Promise<void>((r) => {
        resolveChunks = r;
      }),
    );

    const result = await controller.uploadResume(
      makeFile(),
      { profile_id: 5 },
      makeRequest(1),
    );

    // Response comes back immediately — storeChunks hasn't resolved yet
    expect(result).toEqual(parsed);
    expect(mockRagService.storeChunks).toHaveBeenCalledWith(
      'Extracted resume text content.',
      5,
      'resume',
      1,
    );

    // Resolve the async chunk storage (no error expected)
    resolveChunks();
  });

  it('continues gracefully when storeChunks rejects', async () => {
    const parsed = { name: 'Carol', skills: ['ML'] };
    mockIntelligenceService.parseResume.mockResolvedValue(parsed);
    mockRagService.storeChunks.mockRejectedValue(new Error('DB timeout'));

    const result = await controller.uploadResume(makeFile(), {}, makeRequest());
    expect(result).toEqual(parsed);
  });
});
