/**
 * @file llm-provider.interface.ts
 * @description Shared interface and types for all LLM provider implementations.
 */

/** Represents a single message in a multi-turn conversation. */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

/**
 * Enumeration of supported LLM provider names.
 * These correspond to the values used in `PRIMARY_LLM`, `SECONDARY_LLM`,
 * and `TERTIARY_LLM` environment variables.
 */
export type LlmProviderName = 'groq' | 'claude' | 'gemini';

/** Definition of a tool the LLM can call. */
export interface LlmToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

/**
 * Contract that every LLM provider must implement.
 * Providers are stateless wrappers around a single vendor SDK.
 */
export interface LlmProvider {
  /** Human-readable name used in logs (e.g., `"groq"`). */
  readonly name: LlmProviderName;

  /**
   * Generates a response from the provider given a conversation history
   * and an optional system prompt.
   *
   * @param messages - Ordered list of conversation turns.
   * @param systemPrompt - Instruction text prepended as a system message.
   * @param tools - Optional list of tools the LLM can call.
   * @returns The provider's text response or tool call requests.
   */
  generate(
    messages: ChatMessage[],
    systemPrompt: string,
    tools?: LlmToolDefinition[],
  ): Promise<ChatMessage>;

  isAvailable(): boolean;
}
