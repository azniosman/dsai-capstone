/**
 * @file llm-tool.interface.ts
 * @description Logic for defining and executing tools within the LLM orchestration layer.
 */

import { LlmToolDefinition } from './providers/llm-provider.interface';

/**
 * Encapsulates a tool definition and its execution logic.
 */
export interface LlmTool extends LlmToolDefinition {
  /**
   * Execution logic for the tool.
   * @param args - Arguments passed by the LLM.
   * @param context - Optional execution context (tenantId, userId, etc.).
   * @returns Result string (usually JSON).
   */
  execute(args: any, context?: any): Promise<string>;
}
