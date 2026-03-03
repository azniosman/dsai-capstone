/**
 * @file bedrock.provider.ts
 * @description AWS Bedrock LLM provider using the Anthropic Claude model family
 * via the Bedrock InvokeModel API.
 */

import { Logger } from '@nestjs/common';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import type { ChatMessage, LlmProvider } from './llm-provider.interface';

/**
 * AWS Bedrock provider.
 *
 * Reads the following environment variables (via the constructor parameters):
 * - `BEDROCK_MODEL_ID` — Bedrock model ID (default: `anthropic.claude-3-haiku-20240307-v1:0`)
 * - `AWS_REGION` — AWS region (default: `ap-southeast-1`)
 */
export class BedrockProvider implements LlmProvider {
  readonly name = 'bedrock' as const;

  private readonly logger = new Logger(BedrockProvider.name);
  private readonly client: BedrockRuntimeClient | null;
  private readonly modelId: string;

  constructor(region: string, modelId: string) {
    this.modelId = modelId;
    try {
      this.client = new BedrockRuntimeClient({ region });
      this.logger.log(
        `Bedrock client ready (region=${region}, model=${modelId})`,
      );
    } catch (err) {
      this.logger.warn(
        'Failed to initialise Bedrock client',
        (err as Error).message,
      );
      this.client = null;
    }
  }

  /** Returns `true` when the Bedrock client was initialised successfully. */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Sends a multi-turn conversation to Bedrock using the Anthropic Messages API
   * format and returns the assistant's text reply.
   *
   * @param messages - Conversation history.
   * @param systemPrompt - System-level instruction.
   * @returns The assistant's text response.
   */
  async generate(
    messages: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('Bedrock client not available');
    }

    const bedrockMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const body = JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048,
      system: systemPrompt,
      messages: bedrockMessages,
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });

    const response = await this.client.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(decoded);

    // Anthropic Claude returns { content: [{ type: 'text', text: '...' }] }
    return parsed.content?.[0]?.text ?? '';
  }
}
