/**
 * @file llm.service.spec.ts
 * @description Unit tests for {@link LlmService} — covers the 3-provider routing
 * chain (Groq → Claude → Gemini) and all fallback combinations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { LlmService } from './llm.service';

// ── Provider mocks ────────────────────────────────────────────────────────────

/** Mock for Groq SDK */
jest.mock('groq-sdk', () => {
  const mockCreate = jest.fn();
  const MockGroq = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
  return {
    default: MockGroq,
    __mockCreate: mockCreate,
    __MockGroq: MockGroq,
  };
});

/** Mock for Anthropic Claude SDK */
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest
    .fn()
    .mockImplementation(() => ({ messages: { create: mockCreate } }));
  return {
    Anthropic: MockAnthropic,
    default: MockAnthropic,
    __mockCreate: mockCreate,
    __MockAnthropic: MockAnthropic,
  };
});

/** Mock for Google Gemini SDK */
jest.mock('@google/generative-ai', () => {
  const mockSendMessage = jest.fn();
  const mockGenerateContent = jest.fn();
  const mockStartChat = jest
    .fn()
    .mockReturnValue({ sendMessage: mockSendMessage });
  const mockGetGenerativeModel = jest.fn().mockReturnValue({
    startChat: mockStartChat,
    generateContent: mockGenerateContent,
  });
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
    __mockSendMessage: mockSendMessage,
    __mockGenerateContent: mockGenerateContent,
    __mockStartChat: mockStartChat,
  };
});

// ── Mock accessors ─────────────────────────────────────────────────────────

const getGroqCreate = (): jest.Mock =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('groq-sdk').__mockCreate;

const getClaudeCreate = (): jest.Mock =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@anthropic-ai/sdk').__mockCreate;

const getGeminiMocks = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mocks = require('@google/generative-ai');
  return {
    sendMessage: mocks.__mockSendMessage as jest.Mock,
    generateContent: mocks.__mockGenerateContent as jest.Mock,
    startChat: mocks.__mockStartChat as jest.Mock,
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Builds a Groq-style Chat Completions response. */
const groqResponse = (text: string) => ({
  choices: [{ message: { content: text } }],
});

/** Builds an Anthropic SDK-style response. */
const claudeResponse = (text: string) => ({
  content: [{ type: 'text', text }],
});

/** Builds a Gemini generateContent response. */
const geminiContentResponse = (text: string) => ({
  response: { text: () => text },
});

// ── Shared ConfigService factory ───────────────────────────────────────────

/**
 * Creates a ConfigService mock with the given LLM provider priority.
 * All three providers' credentials are always set so they all initialise.
 */
const buildConfig = (
  primary = 'groq',
  secondary = 'claude',
  tertiary = 'gemini',
) =>
  ({
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        PRIMARY_LLM: primary,
        SECONDARY_LLM: secondary,
        TERTIARY_LLM: tertiary,
        GROQ_API_KEY: 'test-groq-key',
        GROQ_MODEL: 'llama-3.3-70b-versatile',
        AI_TEMPERATURE: '0.3',
        AI_MAX_TOKENS: '2048',
        ANTHROPIC_API_KEY: 'test-claude-key',
        CLAUDE_MODEL: 'claude-3-5-sonnet-20241022',
        GEMINI_API_KEY: 'test-gemini-key',
        GEMINI_MODEL: 'gemini-2.0-flash',
      };
      return config[key];
    }),
  }) as unknown as ConfigService;

// ── Test suite ─────────────────────────────────────────────────────────────

describe('LlmService', () => {
  let service: LlmService;
  let groqCreate: jest.Mock;
  let claudeCreate: jest.Mock;
  let gemini: ReturnType<typeof getGeminiMocks>;

  beforeEach(async () => {
    groqCreate = getGroqCreate();
    claudeCreate = getClaudeCreate();
    gemini = getGeminiMocks();

    groqCreate.mockReset();
    claudeCreate.mockReset();
    gemini.sendMessage.mockReset();
    gemini.generateContent.mockReset();
    gemini.startChat
      .mockReset()
      .mockReturnValue({ sendMessage: gemini.sendMessage });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        { provide: ConfigService, useValue: buildConfig() },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });

  // ── Provider chain routing ─────────────────────────────────────────────

  describe('Provider chain routing', () => {
    const inputMessages = [{ role: 'user', content: 'Hello' }];
    const inputSystemPrompt = 'You are a helpful assistant.';

    it('serves from Groq when Groq succeeds (primary)', async () => {
      groqCreate.mockResolvedValue(groqResponse('Groq reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Groq reply');
      expect(claudeCreate).not.toHaveBeenCalled();
      expect(gemini.sendMessage).not.toHaveBeenCalled();
      expect(service.getLastUsedProvider()).toBe('groq');
    });

    it('falls back to Claude when Groq fails', async () => {
      groqCreate.mockRejectedValue(new Error('Groq timeout'));
      claudeCreate.mockResolvedValue(claudeResponse('Claude reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Claude reply');
      expect(gemini.sendMessage).not.toHaveBeenCalled();
      expect(service.getLastUsedProvider()).toBe('claude');
    });

    it('falls back to Gemini when Groq and Claude both fail', async () => {
      groqCreate.mockRejectedValue(new Error('Groq unavailable'));
      claudeCreate.mockRejectedValue(new Error('Claude rate limit'));
      gemini.generateContent.mockResolvedValue(
        geminiContentResponse('Gemini reply'),
      );

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Gemini reply');
      expect(service.getLastUsedProvider()).toBe('gemini');
    });

    it('throws ServiceUnavailableException when all providers fail', async () => {
      groqCreate.mockRejectedValue(new Error('Groq error'));
      claudeCreate.mockRejectedValue(new Error('Claude error'));
      gemini.sendMessage.mockRejectedValue(new Error('Gemini error'));
      gemini.generateContent.mockRejectedValue(new Error('Gemini error'));

      await expect(
        service.chat(inputMessages, inputSystemPrompt),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });

  // ── chat() ─────────────────────────────────────────────────────────────

  describe('chat()', () => {
    const inputMessages = [{ role: 'user', content: 'Hello' }];
    const inputSystemPrompt = 'You are a helpful assistant.';

    it('returns Groq response via chat', async () => {
      groqCreate.mockResolvedValue(groqResponse('Groq chat reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Groq chat reply');
    });

    it('uses Claude as fallback for chat', async () => {
      groqCreate.mockRejectedValue(new Error('Groq error'));
      claudeCreate.mockResolvedValue(claudeResponse('Claude chat reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Claude chat reply');
    });
  });

  // ── parseResume() ──────────────────────────────────────────────────────

  describe('parseResume()', () => {
    const inputResumeText =
      'John Doe\njohn@example.com\nPython, SQL, 5 years experience';
    const expectedParsed = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
      skills: ['Python', 'SQL'],
      experience_years: 5,
    };

    it('parses resume via Groq (primary)', async () => {
      groqCreate.mockResolvedValue(
        groqResponse(JSON.stringify(expectedParsed)),
      );

      const actualResult = await service.parseResume(inputResumeText);

      expect(actualResult.name).toBe('John Doe');
      expect(actualResult.skills).toContain('Python');
    });

    it('parses resume via Claude when Groq fails', async () => {
      groqCreate.mockRejectedValue(new Error('Groq error'));
      claudeCreate.mockResolvedValue(
        claudeResponse(JSON.stringify(expectedParsed)),
      );

      const actualResult = await service.parseResume(inputResumeText);

      expect(actualResult.name).toBe('John Doe');
    });

    it('parses resume via Gemini when Groq and Claude fail', async () => {
      groqCreate.mockRejectedValue(new Error('Groq error'));
      claudeCreate.mockRejectedValue(new Error('Claude error'));
      gemini.generateContent.mockResolvedValue(
        geminiContentResponse(JSON.stringify(expectedParsed)),
      );

      const actualResult = await service.parseResume(inputResumeText);

      expect(actualResult.name).toBe('John Doe');
    });
  });

  // ── generateSkillGapAdvice() ───────────────────────────────────────────

  describe('generateSkillGapAdvice()', () => {
    const inputRole = 'Data Analyst';
    const inputGaps = [
      { skill: 'Python', gap_severity: 'high' },
      { skill: 'SQL', gap_severity: 'medium' },
    ];
    const expectedAdvice = [
      'Learn Python basics on Coursera',
      'Practice SQL on HackerRank',
    ];

    it('returns advice array from Groq', async () => {
      groqCreate.mockResolvedValue(
        groqResponse(JSON.stringify(expectedAdvice)),
      );

      const actualResult = await service.generateSkillGapAdvice(
        inputRole,
        inputGaps,
      );

      expect(actualResult).toHaveLength(2);
      expect(actualResult[0]).toContain('Python');
    });

    it('returns advice from Claude when Groq fails', async () => {
      groqCreate.mockRejectedValue(new Error('Groq error'));
      claudeCreate.mockResolvedValue(
        claudeResponse(JSON.stringify(expectedAdvice)),
      );

      const actualResult = await service.generateSkillGapAdvice(
        inputRole,
        inputGaps,
      );

      expect(actualResult).toHaveLength(2);
    });
  });

  // ── getLastUsedProvider() ──────────────────────────────────────────────

  describe('getLastUsedProvider()', () => {
    it('returns null before any request', () => {
      expect(service.getLastUsedProvider()).toBeNull();
    });

    it('returns "groq" after a successful Groq request', async () => {
      groqCreate.mockResolvedValue(groqResponse('Reply'));

      await service.chat([{ role: 'user', content: 'Hi' }], 'System');

      expect(service.getLastUsedProvider()).toBe('groq');
    });

    it('returns "claude" after Groq fails and Claude succeeds', async () => {
      groqCreate.mockRejectedValue(new Error('Groq error'));
      claudeCreate.mockResolvedValue(claudeResponse('Claude reply'));

      await service.chat([{ role: 'user', content: 'Hi' }], 'System');

      expect(service.getLastUsedProvider()).toBe('claude');
    });
  });
});
