/**
 * @file groq.provider.ts
 * @description Groq LLM provider using the official `groq-sdk` (OpenAI-compatible).
 *
 * Reads:
 * - `GROQ_API_KEY`    — API key from console.groq.com
 * - `GROQ_MODEL`      — model name (default: `llama-3.3-70b-versatile`)
 * - `AI_TEMPERATURE`  — sampling temperature (default: 0.3)
 * - `AI_MAX_TOKENS`   — max output tokens (default: 2048)
 */

import { Logger } from '@nestjs/common';
import type { ChatMessage, LlmProvider } from './llm-provider.interface';

/**
 * Groq provider.
 *
 * Initialisation is skipped gracefully when `GROQ_API_KEY` is absent so the
 * router simply marks this provider as unavailable and skips it.
 */
export class GroqProvider implements LlmProvider {
  readonly name = 'groq' as const;

  private readonly logger = new Logger(GroqProvider.name);
  private readonly client: any;
  private readonly modelId: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(
    apiKey: string | undefined,
    modelId: string,
    temperature: number,
    maxTokens: number,
  ) {
    this.modelId = modelId;
    this.temperature = temperature;
    this.maxTokens = maxTokens;

    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY is not set — Groq provider disabled');
      this.client = null;
      return;
    }

    try {
      // Use dynamic require so Jest module mocking intercepts the constructor.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sdk = require('groq-sdk');
      const GroqClass = sdk.default ?? sdk.Groq ?? sdk;
      this.client = new GroqClass({ apiKey });
      this.logger.log(`Groq client ready (model=${modelId})`);
    } catch (err) {
      this.logger.warn(
        'Failed to initialise Groq client',
        (err as Error).message,
      );
      this.client = null;
    }
  }

  /** Returns `true` when the Groq client was initialised with a valid API key. */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Sends a multi-turn conversation to the Groq API and returns the
   * assistant's text reply.
   *
   * The system prompt is prepended as a `system` role message, which Groq
   * handles identically to OpenAI's Chat Completions API.
   *
   * @param messages     - Conversation history.
   * @param systemPrompt - System-level instruction.
   * @returns The assistant's text response.
   */
  async generate(
    messages: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Groq client not available');
    }

    const groqMessages: {
      role: 'system' | 'user' | 'assistant';
      content: string;
    }[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
        content: m.content,
      })),
    ];

    const completion = await this.client.chat.completions.create({
      model: this.modelId,
      messages: groqMessages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
    });

    return completion.choices[0]?.message?.content ?? '';
  }
}
