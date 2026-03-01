/**
 * @file llm-provider.interface.ts
 * @description Shared interface and types for all LLM provider implementations.
 */

/** Represents a single message in a multi-turn conversation. */
export type ChatMessage = { role: string; content: string };

/**
 * Enumeration of supported LLM provider names.
 * These correspond to the values used in `PRIMARY_LLM`, `SECONDARY_LLM`,
 * and `TERTIARY_LLM` environment variables.
 */
export type LlmProviderName = 'bedrock' | 'claude' | 'gemini';

/**
 * Contract that every LLM provider must implement.
 * Providers are stateless wrappers around a single vendor SDK.
 */
export interface LlmProvider {
  /** Human-readable name used in logs (e.g., `"bedrock"`). */
  readonly name: LlmProviderName;

  /**
   * Generates a response from the provider given a conversation history
   * and an optional system prompt.
   *
   * @param messages - Ordered list of conversation turns.
   * @param systemPrompt - Instruction text prepended as a system message.
   * @returns The provider's text response.
   * @throws Any SDK-level error — the router handles retry and fallback.
   */
  generate(messages: ChatMessage[], systemPrompt: string): Promise<string>;

  /**
   * Returns `true` when the provider is properly configured and ready to
   * handle requests. The router skips providers that return `false`.
   */
  isAvailable(): boolean;
}
