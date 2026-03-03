/**
 * @file gemini.provider.ts
 * @description Google Gemini LLM provider using `@google/generative-ai`.
 *
 * Reads:
 * - `GEMINI_API_KEY` — API key for the Google AI Studio / Gemini API
 * - `GEMINI_MODEL` — model name (default: `gemini-2.0-flash`)
 */

import { Logger } from '@nestjs/common';
import type { ChatMessage, LlmProvider } from './llm-provider.interface';

/**
 * Google Gemini provider.
 *
 * Initialisation is skipped gracefully when `GEMINI_API_KEY` is absent.
 * Multi-turn chat is handled by building a Gemini `history` array from
 * all messages except the last, then sending the final message via
 * `startChat().sendMessage()`.
 */
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini' as const;

  private readonly logger = new Logger(GeminiProvider.name);
  private readonly geminiClient: any;
  private readonly isReady: boolean;

  constructor(apiKey: string | undefined, modelId: string) {
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY is not set — Gemini provider disabled');
      this.geminiClient = null;
      this.isReady = false;
      return;
    }

    try {
      // Dynamic require so missing package doesn't crash the module on import.
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      this.geminiClient = genAI.getGenerativeModel({ model: modelId });
      this.isReady = true;
      this.logger.log(`Gemini client ready (model=${modelId})`);
    } catch (err) {
      this.logger.warn(
        'Failed to initialise Gemini client',
        (err as Error).message,
      );
      this.geminiClient = null;
      this.isReady = false;
    }
  }

  /** Returns `true` when the Gemini client was initialised successfully. */
  isAvailable(): boolean {
    return this.isReady;
  }

  /**
   * Sends a multi-turn conversation to the Gemini API and returns the
   * model's text reply.
   *
   * For single-message requests the method falls back to `generateContent`
   * to avoid an empty-history edge case.
   *
   * @param messages - Conversation history.
   * @param systemPrompt - System-level instruction.
   * @returns The model's text response.
   */
  async generate(
    messages: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    if (!this.geminiClient) {
      throw new Error('Gemini client not available');
    }

    if (messages.length === 1) {
      // Single-turn: use generateContent with system instruction prepended.
      const prompt = `${systemPrompt}\n\n${messages[0]?.content ?? ''}`;
      const result = await this.geminiClient.generateContent(prompt);
      return result.response.text() as string;
    }

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const chat = this.geminiClient.startChat({
      history,
      systemInstruction: {
        role: 'system',
        parts: [{ text: systemPrompt }],
      },
    });

    const result = await chat.sendMessage(lastMessage?.content ?? '');
    return result.response.text() as string;
  }
}
