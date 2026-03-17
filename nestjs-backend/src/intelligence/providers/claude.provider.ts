/**
 * @file claude.provider.ts
 * @description Anthropic Claude direct API provider using the `@anthropic-ai/sdk`.
 *
 * This provider is the Claude API fallback (distinct from Claude-via-Bedrock).
 * It reads:
 * - `ANTHROPIC_API_KEY` — API key for the Anthropic API
 * - `CLAUDE_MODEL` — model name (default: `claude-3-5-sonnet-20241022`)
 * - `AI_MAX_TOKENS` — max tokens for completions (default: `2048`)
 */

import { Logger } from '@nestjs/common';
import type { ChatMessage, LlmProvider } from './llm-provider.interface';

/**
 * Anthropic Claude direct API provider.
 *
 * Uses a dynamic `require()` so Jest can mock the SDK reliably in the test
 * environment. Initialisation is skipped gracefully when `ANTHROPIC_API_KEY`
 * is absent, so this provider simply reports as unavailable and the router
 * skips it.
 */
export class ClaudeProvider implements LlmProvider {
  readonly name = 'claude' as const;

  private readonly logger = new Logger(ClaudeProvider.name);
  private readonly client: any;
  private readonly modelId: string;
  private readonly maxTokens: number;

  constructor(apiKey: string | undefined, modelId: string, maxTokens = 2048) {
    this.modelId = modelId;
    this.maxTokens = maxTokens;

    if (!apiKey) {
      this.logger.warn(
        'ANTHROPIC_API_KEY is not set — Claude direct API provider disabled',
      );
      this.client = null;
      return;
    }

    try {
      // Use dynamic require so Jest module mocking intercepts the constructor.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sdk = require('@anthropic-ai/sdk');
      const AnthropicClass = sdk.Anthropic ?? sdk.default;
      this.client = new AnthropicClass({ apiKey });
      this.logger.log(`Claude direct API client ready (model=${modelId})`);
    } catch (err) {
      this.logger.warn(
        'Failed to initialise Anthropic client',
        (err as Error).message,
      );
      this.client = null;
    }
  }

  /** Returns `true` when the Anthropic client was initialised with a valid API key. */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Sends a multi-turn conversation to the Anthropic Claude API and returns
   * the assistant's response.
   *
   * @param messages - Conversation history.
   * @param systemPrompt - System-level instruction.
   * @param _tools - Optional list of tools (currently unsupported in this provider).
   * @returns The assistant's ChatMessage.
   */
  async generate(
    messages: ChatMessage[],
    systemPrompt: string,
    _tools?: any[],
  ): Promise<ChatMessage> {
    if (!this.client) {
      throw new Error('Claude API client not available');
    }

    const anthropicMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content || '',
    }));

    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: this.maxTokens,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const firstBlock = response.content[0];
    const text =
      firstBlock && firstBlock.type === 'text'
        ? (firstBlock.text as string)
        : '';

    return {
      role: 'assistant',
      content: text,
    };
  }
}
