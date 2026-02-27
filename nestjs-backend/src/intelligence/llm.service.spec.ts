import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { LlmService } from './llm.service';

// Mock the AWS SDK
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

// Mock Google Generative AI
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

function getGeminiMocks() {
  const mocks = require('@google/generative-ai');
  return {
    sendMessage: mocks.__mockSendMessage as jest.Mock,
    generateContent: mocks.__mockGenerateContent as jest.Mock,
    startChat: mocks.__mockStartChat as jest.Mock,
  };
}

function getBedrockMock(): jest.Mock {
  return require('@aws-sdk/client-bedrock-runtime').__mockSend;
}

describe('LlmService', () => {
  let service: LlmService;
  let gemini: ReturnType<typeof getGeminiMocks>;
  let bedrockSend: jest.Mock;

  beforeEach(async () => {
    gemini = getGeminiMocks();
    bedrockSend = getBedrockMock();

    // Reset all mocks
    gemini.sendMessage.mockReset();
    gemini.generateContent.mockReset();
    gemini.startChat
      .mockReset()
      .mockReturnValue({ sendMessage: gemini.sendMessage });
    bedrockSend.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GEMINI_API_KEY: 'test-gemini-key',
                GEMINI_MODEL: 'gemini-2.0-flash',
                AWS_REGION: 'ap-southeast-1',
                BEDROCK_MODEL_ID: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LlmService>(LlmService);
  });

  describe('chat()', () => {
    const messages = [{ role: 'user', content: 'Hello' }];
    const systemPrompt = 'You are a helpful assistant.';

    it('should return Gemini response when Gemini succeeds', async () => {
      gemini.sendMessage.mockResolvedValue({
        response: { text: () => 'Gemini reply' },
      });

      const result = await service.chat(messages, systemPrompt);
      expect(result).toBe('Gemini reply');
      expect(bedrockSend).not.toHaveBeenCalled();
    });

    it('should fall back to Bedrock when Gemini fails', async () => {
      gemini.sendMessage.mockRejectedValue(new Error('Gemini error'));
      bedrockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ type: 'text', text: 'Bedrock reply' }],
          }),
        ),
      });

      const result = await service.chat(messages, systemPrompt);
      expect(result).toBe('Bedrock reply');
    });

    it('should throw ServiceUnavailableException when both fail', async () => {
      gemini.sendMessage.mockRejectedValue(new Error('Gemini error'));
      bedrockSend.mockRejectedValue(new Error('Bedrock error'));

      await expect(service.chat(messages, systemPrompt)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('rewriteBullet()', () => {
    const targetRole = 'Data Engineer';
    const bulletPoint = 'Managed databases';

    it('should return Gemini response when Gemini succeeds', async () => {
      const jsonResponse = {
        rewritten: 'Optimised 5 PostgreSQL databases',
        improvement_notes: 'Added metrics',
      };
      gemini.generateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(jsonResponse) },
      });

      const result = await service.rewriteBullet(targetRole, bulletPoint);
      expect(result.rewritten).toBe('Optimised 5 PostgreSQL databases');
    });

    it('should fall back to Bedrock when Gemini fails', async () => {
      const jsonResponse = {
        rewritten: 'Bedrock rewrite',
        improvement_notes: 'Bedrock notes',
      };
      gemini.generateContent.mockRejectedValue(new Error('Gemini error'));
      bedrockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ type: 'text', text: JSON.stringify(jsonResponse) }],
          }),
        ),
      });

      const result = await service.rewriteBullet(targetRole, bulletPoint);
      expect(result.rewritten).toBe('Bedrock rewrite');
    });
  });

  describe('parseResume()', () => {
    const resumeText =
      'John Doe\njohn@example.com\nPython, SQL, 5 years experience';

    it('should parse resume via Gemini', async () => {
      const parsed = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        skills: ['Python', 'SQL'],
        experience_years: 5,
      };
      gemini.generateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(parsed) },
      });

      const result = await service.parseResume(resumeText);
      expect(result.name).toBe('John Doe');
      expect(result.skills).toContain('Python');
    });

    it('should fall back to Bedrock for resume parsing', async () => {
      const parsed = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '',
        skills: ['Python'],
        experience_years: 5,
      };
      gemini.generateContent.mockRejectedValue(new Error('Gemini error'));
      bedrockSend.mockResolvedValue({
        body: new TextEncoder().encode(
          JSON.stringify({
            content: [{ type: 'text', text: JSON.stringify(parsed) }],
          }),
        ),
      });

      const result = await service.parseResume(resumeText);
      expect(result.name).toBe('John Doe');
    });
  });

  describe('generateSkillGapAdvice()', () => {
    it('should return advice array from Gemini', async () => {
      const advice = [
        'Learn Python basics on Coursera',
        'Practice SQL on HackerRank',
      ];
      gemini.generateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(advice) },
      });

      const result = await service.generateSkillGapAdvice('Data Analyst', [
        { skill: 'Python', gap_severity: 'high' },
        { skill: 'SQL', gap_severity: 'medium' },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Python');
    });
  });
});
