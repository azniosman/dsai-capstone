/**
 * @file intelligence.service.spec.ts
 * @description Unit tests for IntelligenceService — covers scoring formula,
 * gap calculation, chat RAG augmentation, rewriteResume, and interview.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { IntelligenceService } from './intelligence.service';
import { LlmService } from './llm.service';
import { RagService } from '../rag/rag.service';
import { RagPipelineService } from '../rag/rag-pipeline.service';
import { DomainService } from '../domain/domain.service';
import { UserProfile } from '@app/entities/user-profile.entity';
import { JobRole } from '@app/entities/job-role.entity';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockProfile = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  skills: ['Python', 'SQL', 'Machine Learning'],
  yearsExperience: 3,
  isCareerSwitcher: false,
  tenant: { id: 1 },
};

const mockRole = {
  id: 10,
  title: 'Data Analyst',
  category: 'Data',
  salaryRange: 'SGD 4,000–7,000',
  requiredSkills: ['Python', 'SQL', 'Tableau'],
  preferredSkills: ['R', 'Power BI'],
  minExperienceYears: 2,
  careerSwitcherFriendly: true,
  tenant: { id: 1 },
};

const mockChunks = [
  {
    id: 1,
    content: 'Data analysts in Singapore earn SGD 5,000 on average.',
    source_type: 'market',
  },
];

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockProfileRepo = {
  findOne: jest.fn(),
};

const mockRoleRepo = {
  find: jest.fn(),
};

const mockLlmService = {
  chat: jest.fn(),
  generateRationale: jest.fn(),
  generateSkillGapAdvice: jest.fn(),
  parseResume: jest.fn(),
  analyzeJobDescription: jest.fn(),
  getLastUsedProvider: jest.fn().mockReturnValue('groq'),
};

const mockRagService = {
  query: jest.fn(),
  formatContext: jest.fn(),
};

const mockRagPipelineService = {
  createContext: jest.fn().mockReturnValue({
    traceId: 'test_trace_id',
    hasCriticalFailure: false,
  }),
  query: jest.fn(),
  formatContext: jest.fn(),
  runStep: jest.fn(async (_ctx, _step, fn) => {
    // Execute the function and return its result
    return await fn();
  }),
};

const mockDomainService = {};

// ── Test suite ────────────────────────────────────────────────────────────────

describe('IntelligenceService', () => {
  let service: IntelligenceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        { provide: getRepositoryToken(UserProfile), useValue: mockProfileRepo },
        { provide: getRepositoryToken(JobRole), useValue: mockRoleRepo },
        { provide: LlmService, useValue: mockLlmService },
        { provide: RagService, useValue: mockRagService },
        { provide: RagPipelineService, useValue: mockRagPipelineService },
        { provide: DomainService, useValue: mockDomainService },
      ],
    }).compile();

    service = module.get<IntelligenceService>(IntelligenceService);
    jest.clearAllMocks();
  });

  // ── getRecommendations ────────────────────────────────────────────────────

  describe('getRecommendations', () => {
    it('throws NotFoundException when profile is missing', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      await expect(
        service.getRecommendations({ profile_id: 999 }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns scored roles sorted by match_score descending', async () => {
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockRoleRepo.find.mockResolvedValue([mockRole]);
      mockLlmService.generateRationale.mockResolvedValue([
        'Strong match for SQL skills.',
      ]);

      const result = await service.getRecommendations({ profile_id: 1 }, 1);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Data Analyst');
      // Python + SQL matched (2/3 required skills) → contentScore ≈ 0.667
      // yearsExperience 3 >= minExperienceYears 2 → ruleScore = 1.0
      // careerBonus = 0 (isCareerSwitcher false)
      // score = 0.55*0.667 + 0.25*1.0 + 0.20*0 ≈ 0.617
      expect(result[0].match_score).toBeCloseTo(0.617, 2);
      expect(result[0].matched_skills).toContain('Python');
      expect(result[0].missing_skills).toContain('Tableau');
    });

    it('applies career switcher bonus when both profile and role qualify', async () => {
      const switcherProfile = { ...mockProfile, isCareerSwitcher: true };
      mockProfileRepo.findOne.mockResolvedValue(switcherProfile);
      mockRoleRepo.find.mockResolvedValue([mockRole]);
      mockLlmService.generateRationale.mockResolvedValue([]);

      const result = await service.getRecommendations({ profile_id: 1 }, 1);
      // careerBonus = 1.0 → score = 0.55*0.667 + 0.25*1.0 + 0.20*1.0 ≈ 0.817
      expect(result[0].match_score).toBeCloseTo(0.817, 2);
      expect(result[0].career_switcher_bonus).toBe(1);
    });
  });

  // ── getSkillGap ───────────────────────────────────────────────────────────

  describe('getSkillGap', () => {
    it('throws NotFoundException when profile is missing', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      await expect(service.getSkillGap(999, 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns top 3 roles with gap arrays', async () => {
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockRoleRepo.find.mockResolvedValue([mockRole]);
      mockLlmService.generateSkillGapAdvice.mockResolvedValue([
        'Learn Tableau via SkillsFuture.',
      ]);

      const result = await service.getSkillGap(1, 1);

      expect(result).toHaveLength(1);
      expect(result[0].role_title).toBe('Data Analyst');
      // Tableau is missing from profile → should appear in gaps
      expect(result[0].gaps.some((g: any) => g.skill === 'Tableau')).toBe(true);
    });

    it('attaches LLM advice to gaps', async () => {
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockRoleRepo.find.mockResolvedValue([mockRole]);
      mockLlmService.generateSkillGapAdvice.mockResolvedValue([
        'Enrol in a Tableau course.',
      ]);

      const result = await service.getSkillGap(1, 1);
      const tableauGap = result[0].gaps.find((g: any) => g.skill === 'Tableau');
      expect(tableauGap?.ai_advice).toBe('Enrol in a Tableau course.');
    });
  });

  // ── chat ──────────────────────────────────────────────────────────────────

  describe('chat', () => {
    it('augments system prompt with RAG context when chunks are found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockRagService.query.mockResolvedValue(mockChunks);
      jest
        .spyOn(RagService, 'formatContext')
        .mockReturnValue(
          '\n\nRelevant context from your documents:\n[1] (similarity: 0.70)\nData analysts earn SGD 5,000.',
        );
      mockLlmService.chat.mockResolvedValue('Great question!');

      await service.chat(
        {
          profile_id: 1,
          messages: [{ role: 'user', content: 'What do data analysts earn?' }],
        },
        1,
      );

      expect(mockLlmService.chat).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('Relevant context'),
      );
    });

    it('proceeds without RAG context if ragService throws', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockRagService.query.mockRejectedValue(new Error('DB error'));
      mockLlmService.chat.mockResolvedValue('Hello!');

      const result = await service.chat(
        { messages: [{ role: 'user', content: 'Hi' }] },
        1,
      );
      expect(result.reply).toBe('Hello!');
    });

    it('returns engine label from LlmService', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockRagService.query.mockResolvedValue([]);
      jest.spyOn(RagService, 'formatContext').mockReturnValue('');
      mockLlmService.chat.mockResolvedValue('Hi!');
      mockLlmService.getLastUsedProvider.mockReturnValue('groq');

      const result = await service.chat(
        { messages: [{ role: 'user', content: 'Hi' }] },
        1,
      );
      expect(result.engine).toBe('Groq');
    });
  });

  // ── rewriteResume ─────────────────────────────────────────────────────────

  describe('rewriteResume', () => {
    it('calls LLM with the bullet and target role in the prompt', async () => {
      mockLlmService.chat.mockResolvedValue(
        'Drove 25% revenue growth by optimising SQL pipelines.',
      );

      const result = await service.rewriteResume(
        'Helped with SQL',
        'Data Analyst',
      );

      expect(mockLlmService.chat).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Data Analyst'),
          }),
        ],
        expect.any(String),
      );
      expect(result.rewritten_bullet).toBe(
        'Drove 25% revenue growth by optimising SQL pipelines.',
      );
      expect(result.engine).toBe('Groq');
    });
  });

  // ── interview ─────────────────────────────────────────────────────────────

  describe('interview', () => {
    it('returns a reply and engine from the LLM', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);
      mockRagService.query.mockResolvedValue([]);
      jest.spyOn(RagService, 'formatContext').mockReturnValue('');
      mockLlmService.chat.mockResolvedValue(
        'Tell me about your experience with Python.',
      );
      mockLlmService.getLastUsedProvider.mockReturnValue('gemini');

      const result = await service.interview(
        {
          job_title: 'Data Analyst',
          messages: [{ role: 'user', content: 'Ready to start.' }],
        },
        1,
      );

      expect(result.reply).toContain('Python');
      expect(result.engine).toBe('Google Gemini');
    });

    it('includes profile skill context in system prompt when profile_id provided', async () => {
      mockProfileRepo.findOne.mockResolvedValue(mockProfile);
      mockRagService.query.mockResolvedValue([]);
      jest.spyOn(RagService, 'formatContext').mockReturnValue('');
      mockLlmService.chat.mockResolvedValue('Great answer!');

      await service.interview(
        {
          profile_id: 1,
          job_title: 'Data Analyst',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        1,
      );

      // System prompt passed to llmService.chat should mention profile skills
      const systemPromptArg = mockLlmService.chat.mock.calls[0][1] as string;
      expect(systemPromptArg).toContain('Python');
    });
  });
});
