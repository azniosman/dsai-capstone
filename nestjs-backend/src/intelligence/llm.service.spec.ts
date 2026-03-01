/**
 * @file llm.service.spec.ts
 * @description Unit tests for {@link LlmService} — covers the 3-provider routing
 * chain (Bedrock → Claude → Gemini) and all fallback combinations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { LlmService } from './llm.service';

// ── Provider mocks ────────────────────────────────────────────────────────────

/** Mock for AWS Bedrock SDK */
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = jest.fn();
  return {
    BedrockRuntimeClient: jest
      .fn()
      .mockImplementation(() => ({ send: mockSend })),
    InvokeModelCommand: jest.fn().mockImplementation((input) => input),
    __mockSend: mockSend,
  };
});

/** Mock for Anthropic Claude SDK */
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest
    .fn()
    .mockImplementation(() => ({ messages: { create: mockCreate } }));
  return {
    // Named export (used by ClaudeProvider via require('@anthropic-ai/sdk').Anthropic)
    Anthropic: MockAnthropic,
    // Default export (used when import Anthropic from '@anthropic-ai/sdk')
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

const getBedrockSend = (): jest.Mock =>
  require('@aws-sdk/client-bedrock-runtime').__mockSend;

const getClaudeCreate = (): jest.Mock =>
  require('@anthropic-ai/sdk').__mockCreate;

const getGeminiMocks = () => {
  const mocks = require('@google/generative-ai');
  return {
    sendMessage: mocks.__mockSendMessage as jest.Mock,
    generateContent: mocks.__mockGenerateContent as jest.Mock,
    startChat: mocks.__mockStartChat as jest.Mock,
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Builds a Bedrock-style response body (Anthropic Messages format). */
const bedrockResponse = (text: string): { body: Uint8Array } => ({
  body: new TextEncoder().encode(
    JSON.stringify({ content: [{ type: 'text', text }] }),
  ),
});

/** Builds an Anthropic SDK-style response. */
const claudeResponse = (text: string) => ({
  content: [{ type: 'text', text }],
});

/** Builds a Gemini chat sendMessage response. */
const geminiChatResponse = (text: string) => ({
  response: { text: () => text },
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
  primary = 'bedrock',
  secondary = 'claude',
  tertiary = 'gemini',
) =>
  ({
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        PRIMARY_LLM: primary,
        SECONDARY_LLM: secondary,
        TERTIARY_LLM: tertiary,
        AWS_REGION: 'ap-southeast-1',
        BEDROCK_MODEL_ID: 'anthropic.claude-3-haiku-20240307-v1:0',
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
  let bedrockSend: jest.Mock;
  let claudeCreate: jest.Mock;
  let gemini: ReturnType<typeof getGeminiMocks>;

  beforeEach(async () => {
    bedrockSend = getBedrockSend();
    claudeCreate = getClaudeCreate();
    gemini = getGeminiMocks();

    // Reset all mocks before each test.
    bedrockSend.mockReset();
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

    it('serves from Bedrock when Bedrock succeeds (primary)', async () => {
      bedrockSend.mockResolvedValue(bedrockResponse('Bedrock reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Bedrock reply');
      expect(claudeCreate).not.toHaveBeenCalled();
      expect(gemini.sendMessage).not.toHaveBeenCalled();
      expect(service.getLastUsedProvider()).toBe('bedrock');
    });

    it('falls back to Claude when Bedrock fails', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock timeout'));
      claudeCreate.mockResolvedValue(claudeResponse('Claude reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Claude reply');
      expect(gemini.sendMessage).not.toHaveBeenCalled();
      expect(service.getLastUsedProvider()).toBe('claude');
    });

    it('falls back to Gemini when Bedrock and Claude both fail', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock unavailable'));
      claudeCreate.mockRejectedValue(new Error('Claude rate limit'));
      gemini.generateContent.mockResolvedValue(geminiContentResponse('Gemini reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Gemini reply');
      expect(service.getLastUsedProvider()).toBe('gemini');
    });

    it('throws ServiceUnavailableException when all providers fail', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
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

    it('returns Bedrock response via chat', async () => {
      bedrockSend.mockResolvedValue(bedrockResponse('Bedrock chat reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Bedrock chat reply');
    });

    it('uses Claude as fallback for chat', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
      claudeCreate.mockResolvedValue(claudeResponse('Claude chat reply'));

      const actualResult = await service.chat(inputMessages, inputSystemPrompt);

      expect(actualResult).toBe('Claude chat reply');
    });
  });

  // ── rewriteBullet() ────────────────────────────────────────────────────

  describe('rewriteBullet()', () => {
    const inputTargetRole = 'Data Engineer';
    const inputBulletPoint = 'Managed databases';
    const expectedRewritten = {
      rewritten: 'Optimised 5 PostgreSQL databases',
      improvement_notes: 'Added metrics',
    };

    it('returns parsed JSON from Bedrock', async () => {
      bedrockSend.mockResolvedValue(
        bedrockResponse(JSON.stringify(expectedRewritten)),
      );

      const actualResult = await service.rewriteBullet(
        inputTargetRole,
        inputBulletPoint,
      );

      expect(actualResult.rewritten).toBe('Optimised 5 PostgreSQL databases');
    });

    it('falls back to Claude when Bedrock fails', async () => {
      const mockClaudeResponse = {
        rewritten: 'Claude rewrite',
        improvement_notes: 'Claude notes',
      };
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
      claudeCreate.mockResolvedValue(
        claudeResponse(JSON.stringify(mockClaudeResponse)),
      );

      const actualResult = await service.rewriteBullet(
        inputTargetRole,
        inputBulletPoint,
      );

      expect(actualResult.rewritten).toBe('Claude rewrite');
    });

    it('falls back to Gemini when Bedrock and Claude fail', async () => {
      const mockGeminiResponse = {
        rewritten: 'Gemini rewrite',
        improvement_notes: 'Gemini notes',
      };
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
      claudeCreate.mockRejectedValue(new Error('Claude error'));
      gemini.generateContent.mockResolvedValue(
        geminiContentResponse(JSON.stringify(mockGeminiResponse)),
      );

      const actualResult = await service.rewriteBullet(
        inputTargetRole,
        inputBulletPoint,
      );

      expect(actualResult.rewritten).toBe('Gemini rewrite');
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

    it('parses resume via Bedrock (primary)', async () => {
      bedrockSend.mockResolvedValue(
        bedrockResponse(JSON.stringify(expectedParsed)),
      );

      const actualResult = await service.parseResume(inputResumeText);

      expect(actualResult.name).toBe('John Doe');
      expect(actualResult.skills).toContain('Python');
    });

    it('parses resume via Claude when Bedrock fails', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
      claudeCreate.mockResolvedValue(
        claudeResponse(JSON.stringify(expectedParsed)),
      );

      const actualResult = await service.parseResume(inputResumeText);

      expect(actualResult.name).toBe('John Doe');
    });

    it('parses resume via Gemini when Bedrock and Claude fail', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
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

    it('returns advice array from Bedrock', async () => {
      bedrockSend.mockResolvedValue(
        bedrockResponse(JSON.stringify(expectedAdvice)),
      );

      const actualResult = await service.generateSkillGapAdvice(
        inputRole,
        inputGaps,
      );

      expect(actualResult).toHaveLength(2);
      expect(actualResult[0]).toContain('Python');
    });

    it('returns advice from Claude when Bedrock fails', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
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

    it('returns "bedrock" after a successful Bedrock request', async () => {
      bedrockSend.mockResolvedValue(bedrockResponse('Reply'));

      await service.chat([{ role: 'user', content: 'Hi' }], 'System');

      expect(service.getLastUsedProvider()).toBe('bedrock');
    });

    it('returns "claude" after Bedrock fails and Claude succeeds', async () => {
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));
      claudeCreate.mockResolvedValue(claudeResponse('Claude reply'));

      await service.chat([{ role: 'user', content: 'Hi' }], 'System');

      expect(service.getLastUsedProvider()).toBe('claude');
    });
  });
});
