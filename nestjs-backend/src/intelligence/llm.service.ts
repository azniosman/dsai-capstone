/**
 * @file llm.service.ts
 * @description NestJS service providing a unified, env-driven multi-provider LLM
 * routing layer.
 *
 * Provider priority is configured via environment variables:
 * - `PRIMARY_LLM`   — first provider to try  (default: `bedrock`)
 * - `SECONDARY_LLM` — second provider to try (default: `claude`)
 * - `TERTIARY_LLM`  — third provider to try  (default: `gemini`)
 *
 * Supported provider values: `bedrock` | `claude` | `gemini`
 *
 * The router attempts providers in priority order, logging each attempt and
 * any fallbacks. If every configured provider fails, a
 * `ServiceUnavailableException` is thrown.
 */

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { LlmProvider, LlmProviderName, ChatMessage } from './providers/llm-provider.interface';
import { BedrockProvider } from './providers/bedrock.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';

/** Re-export for consumers that imported `ChatMessage` from this module. */
export type { ChatMessage };

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  /** Ordered list of providers to attempt for each request. */
  private readonly providerChain: LlmProvider[];

  /**
   * Name of the provider that handled the most recent request.
   * Used by `IntelligenceService` to report the active engine to the client.
   */
  private lastUsedProvider: LlmProviderName | null = null;

  constructor(private readonly configService: ConfigService) {
    // ── Build individual providers ─────────────────────────────────────────
    const region =
      this.configService.get<string>('AWS_REGION') ?? 'ap-southeast-1';
    const bedrockModelId =
      this.configService.get<string>('BEDROCK_MODEL_ID') ??
      'anthropic.claude-3-haiku-20240307-v1:0';

    const claudeApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const claudeModel =
      this.configService.get<string>('CLAUDE_MODEL') ??
      'claude-3-5-sonnet-20241022';

    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const geminiModel =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';

    const allProviders: Record<LlmProviderName, LlmProvider> = {
      bedrock: new BedrockProvider(region, bedrockModelId),
      claude: new ClaudeProvider(claudeApiKey, claudeModel),
      gemini: new GeminiProvider(geminiApiKey, geminiModel),
    };

    // ── Build ordered chain from env ───────────────────────────────────────
    const primaryName =
      (this.configService.get<string>('PRIMARY_LLM') as LlmProviderName) ??
      'bedrock';
    const secondaryName =
      (this.configService.get<string>('SECONDARY_LLM') as LlmProviderName) ??
      'claude';
    const tertiaryName =
      (this.configService.get<string>('TERTIARY_LLM') as LlmProviderName) ??
      'gemini';

    this.providerChain = [primaryName, secondaryName, tertiaryName]
      .map((name) => allProviders[name])
      .filter((p): p is LlmProvider => p !== undefined && p.isAvailable());

    const chainNames = this.providerChain.map((p) => p.name).join(' → ');
    if (this.providerChain.length === 0) {
      this.logger.warn(
        'LLM router: no providers are available. Configure at least one of: ' +
          'AWS credentials (bedrock), ANTHROPIC_API_KEY (claude), GEMINI_API_KEY (gemini).',
      );
    } else {
      this.logger.log(`Provider chain: ${chainNames}`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Returns the name of the LLM provider that served the most recent request.
   * Used by `IntelligenceService` to populate the `engine` field in responses.
   *
   * @returns Provider name string or `null` if no request has been made yet.
   */
  getLastUsedProvider(): LlmProviderName | null {
    return this.lastUsedProvider;
  }

  /**
   * Iterates the provider chain in priority order, attempting each provider
   * in turn. Records latency and logs each attempt and fallback.
   *
   * @param label - Short label used in log messages (e.g. `"chat"`).
   * @param messages - Conversation history passed to the provider.
   * @param systemPrompt - System instruction passed to the provider.
   * @returns The first successful provider response.
   * @throws `ServiceUnavailableException` when all providers fail.
   */
  private async withFallback(
    label: string,
    messages: ChatMessage[],
    systemPrompt: string,
  ): Promise<string> {
    if (this.providerChain.length === 0) {
      throw new ServiceUnavailableException(
        'No LLM providers are configured. Set AWS credentials, ANTHROPIC_API_KEY, or GEMINI_API_KEY.',
      );
    }

    for (const provider of this.providerChain) {
      const start = Date.now();
      try {
        const result = await provider.generate(messages, systemPrompt);
        const latencyMs = Date.now() - start;
        this.logger.log(
          `[${label}] Using provider: ${provider.name} (${latencyMs}ms)`,
        );
        this.lastUsedProvider = provider.name;
        return result;
      } catch (err) {
        const latencyMs = Date.now() - start;
        const nextProvider = this.providerChain[
          this.providerChain.indexOf(provider) + 1
        ];
        if (nextProvider) {
          this.logger.warn(
            `[${label}] ${provider.name} failed after ${latencyMs}ms (${(err as Error).message}), ` +
              `trying ${nextProvider.name}`,
          );
        } else {
          this.logger.error(
            `[${label}] All providers failed. Last error from ${provider.name}: ${(err as Error).message}`,
          );
        }
      }
    }

    throw new ServiceUnavailableException(
      `LLM unavailable for "${label}". All configured providers failed.`,
    );
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /**
   * Sends a multi-turn chat conversation to the active LLM provider.
   *
   * @param messages - Ordered conversation history.
   * @param systemPrompt - System-level instruction for the model.
   * @returns The model's text reply.
   */
  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    return this.withFallback('chat', messages, systemPrompt);
  }

  /**
   * Generates a next interview question or an end-of-interview feedback
   * summary for the mock interview feature.
   *
   * @param roleTitle - Job role being practised (e.g. `"Data Engineer"`).
   * @param difficulty - Difficulty level (`"easy"` | `"medium"` | `"hard"`).
   * @param previousMessages - Prior conversation turns.
   * @param targetSkill - Skill currently being probed.
   * @param isComplete - When `true`, generates feedback instead of a question.
   * @returns An object with `reply` (and optional `feedback` when complete).
   */
  async generateInterviewQuestion(
    roleTitle: string,
    difficulty: string,
    previousMessages: ChatMessage[],
    targetSkill: string,
    isComplete: boolean,
  ): Promise<{ reply: string; feedback?: string }> {
    if (isComplete) {
      const transcript = previousMessages
        .map(
          (m) =>
            `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`,
        )
        .join('\n');
      const systemPrompt =
        `You are conducting a mock interview for a ${roleTitle} role (difficulty: ${difficulty}). ` +
        `Based on the interview transcript below, provide concise constructive feedback (3-4 sentences) ` +
        `highlighting strengths and areas to improve.\n\nTranscript:\n${transcript}`;
      const feedback = await this.withFallback(
        'interview-feedback',
        [{ role: 'user', content: 'Provide interview feedback.' }],
        systemPrompt,
      );
      return {
        reply:
          'Great effort throughout the interview! Here is your personalised feedback.',
        feedback,
      };
    }

    const systemPrompt =
      `You are a technical interviewer for a ${roleTitle} position (difficulty: ${difficulty}). ` +
      `Ask ONE concise, specific interview question targeting the skill: "${targetSkill}". ` +
      `Do not reveal which skill you are testing. Only output the question, nothing else.`;

    const questionMessages: ChatMessage[] = [
      ...previousMessages,
      {
        role: 'user',
        content: `Ask a ${difficulty} interview question about ${targetSkill} for ${roleTitle}.`,
      },
    ];

    const reply = await this.withFallback(
      'interview-question',
      questionMessages,
      systemPrompt,
    );
    return { reply };
  }

  /**
   * Rewrites a resume bullet point to be more impactful for the target role.
   *
   * @param targetRole - Role title the bullet should be tailored towards.
   * @param bulletPoint - The original resume bullet text.
   * @returns An object with `rewritten` text and `improvement_notes`.
   */
  async rewriteBullet(
    targetRole: string,
    bulletPoint: string,
  ): Promise<{ rewritten: string; improvement_notes: string }> {
    const systemPrompt =
      'You are a professional resume writer. Respond only in the JSON format requested.';
    const userPrompt =
      `Rewrite the following resume bullet point to be more impactful and relevant for a ${targetRole} role. ` +
      `Use strong action verbs and quantify where possible.\n\n` +
      `Original: "${bulletPoint}"\n\n` +
      `Respond in JSON format: { "rewritten": "...", "improvement_notes": "1-2 sentences explaining improvements" }`;

    const text = await this.withFallback(
      'rewriteBullet',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
      null,
      text,
    ];
    return JSON.parse(jsonMatch[1].trim());
  }

  /**
   * Analyses a job description and computes a skill match score against the
   * candidate's profile.
   *
   * @param jdText - Raw job description text (truncated to 3 000 chars).
   * @param profileSkills - List of skills from the candidate's profile.
   * @returns Extracted skills, match score, and skill gaps.
   */
  async analyzeJobDescription(
    jdText: string,
    profileSkills: string[],
  ): Promise<{
    extracted_skills: string[];
    match_score: number;
    gaps: string[];
  }> {
    const systemPrompt =
      'You are a career analyst. Respond only in the JSON format requested.';
    const userPrompt =
      `Analyse this job description and extract the required technical and soft skills.\n\n` +
      `Job Description:\n${jdText.substring(0, 3000)}\n\n` +
      `Candidate's current skills: ${profileSkills.join(', ')}\n\n` +
      `Respond in JSON format:\n` +
      `{ "extracted_skills": ["skill1", "skill2", ...], "match_score": 0.0-1.0, "gaps": ["missing_skill1", ...] }\n` +
      `match_score is the fraction of extracted_skills present in candidate's skills.`;

    const text = await this.withFallback(
      'analyzeJD',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
      null,
      text,
    ];
    return JSON.parse(jsonMatch[1].trim());
  }

  /**
   * Parses a plain-text resume into structured profile fields using the LLM.
   *
   * @param text - Raw resume text (truncated to 4 000 chars).
   * @returns Parsed profile: name, email, phone, skills, experience years.
   */
  async parseResume(text: string): Promise<{
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience_years: number;
  }> {
    const systemPrompt =
      'You are an expert resume parser. Respond only in the JSON format requested.';
    const userPrompt =
      `Extract structured data from the following resume text.\n\n` +
      `Resume:\n${text.substring(0, 4000)}\n\n` +
      `Respond in JSON format:\n` +
      `{ "name": "Full Name", "email": "email@example.com", "phone": "+65...", ` +
      `"skills": ["skill1", "skill2", ...], "experience_years": <number> }\n` +
      `If a field is not found, use empty string for strings, empty array for skills, and 0 for experience_years.`;

    const raw = await this.withFallback(
      'parseResume',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    return JSON.parse(jsonMatch[1].trim());
  }

  /**
   * Generates a short personalised rationale sentence for each of the top
   * matched roles.
   *
   * @param profileSummary - Brief text summary of the candidate's profile.
   * @param topRoles - List of top role matches with score and skill details.
   * @returns Array of rationale strings (one per role, in the same order).
   */
  async generateRationale(
    profileSummary: string,
    topRoles: {
      title: string;
      matchScore: number;
      matched: string[];
      missing: string[];
    }[],
  ): Promise<string[]> {
    const rolesBlock = topRoles
      .map(
        (r, i) =>
          `${i + 1}. ${r.title} (${Math.round(r.matchScore * 100)}% fit) — matched: ${r.matched.join(', ')}; gaps: ${r.missing.join(', ') || 'none'}`,
      )
      .join('\n');

    const systemPrompt =
      'You are a Singapore career advisor for SCTP learners. Respond only in the JSON format requested.';
    const userPrompt =
      `Given the profile summary and role matches below, write ONE short personalised rationale sentence ` +
      `for each role explaining why it is a good fit and what to focus on.\n\n` +
      `Profile: ${profileSummary}\n\nRoles:\n${rolesBlock}\n\n` +
      `Respond as a JSON array of strings — one rationale per role in the same order. No markdown, only JSON.`;

    const raw = await this.withFallback(
      'generateRationale',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    return JSON.parse(jsonMatch[1].trim());
  }

  /**
   * Generates practical, one-sentence learning tips for each skill gap.
   *
   * @param roleTitle - Target job role title.
   * @param gaps - List of skill gaps with severity labels.
   * @returns Array of tip strings (one per gap, in the same order).
   */
  async generateSkillGapAdvice(
    roleTitle: string,
    gaps: { skill: string; gap_severity: string }[],
  ): Promise<string[]> {
    const gapsList = gaps
      .map((g) => `${g.skill} (${g.gap_severity} priority)`)
      .join(', ');

    const systemPrompt =
      'You are a Singapore career advisor. Respond only in the JSON format requested.';
    const userPrompt =
      `For a candidate targeting a ${roleTitle} role, ` +
      `provide ONE practical learning tip (1 sentence) for each skill gap below.\n\n` +
      `Gaps: ${gapsList}\n\n` +
      `Respond as a JSON array of strings — one tip per gap in the same order. No markdown, only JSON.`;

    const raw = await this.withFallback(
      'skillGapAdvice',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    return JSON.parse(jsonMatch[1].trim());
  }

  /**
   * Generates a short motivating narrative paragraph for a personalised
   * upskilling roadmap.
   *
   * @param profileSkills - Current skills of the candidate.
   * @param targetRole - Target job role title.
   * @param gapCount - Number of skill gaps to bridge.
   * @param courseTitles - Recommended course titles for the roadmap.
   * @returns A motivating 3–4 sentence paragraph as a plain string.
   */
  async generateRoadmapNarrative(
    profileSkills: string[],
    targetRole: string,
    gapCount: number,
    courseTitles: string[],
  ): Promise<string> {
    const systemPrompt =
      'You are a Singapore career advisor for SCTP learners. Respond with plain text only, no markdown.';
    const userPrompt =
      `Write a brief motivating paragraph (3-4 sentences) about why this upskilling roadmap ` +
      `will help bridge ${gapCount} skill gaps for the ${targetRole} role.\n\n` +
      `Current skills: ${profileSkills.join(', ')}\n` +
      `Recommended courses: ${courseTitles.join(', ')}\n\n` +
      `Be encouraging and mention SkillsFuture support where relevant. Output only the paragraph.`;

    return this.withFallback(
      'roadmapNarrative',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );
  }
}
