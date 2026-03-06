/**
 * @file llm.service.ts
 * @description NestJS service providing a unified, env-driven multi-provider LLM
 * routing layer.
 *
 * Provider priority is configured via environment variables:
 * - `PRIMARY_LLM`   — first provider to try  (default: `groq`)
 * - `SECONDARY_LLM` — second provider to try (default: `claude`)
 * - `TERTIARY_LLM`  — third provider to try  (default: `gemini`)
 *
 * Supported provider values: `groq` | `claude` | `gemini`
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
import { LogBusService } from '@app/common/log-bus.service';

import type {
  LlmProvider,
  LlmProviderName,
  ChatMessage,
} from './providers/llm-provider.interface';
import { GroqProvider } from './providers/groq.provider';
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

  constructor(
    private readonly configService: ConfigService,
    private readonly logBus: LogBusService,
  ) {
    // ── Build individual providers ─────────────────────────────────────────
    const groqApiKey = this.configService.get<string>('GROQ_API_KEY');
    const groqModel =
      this.configService.get<string>('GROQ_MODEL') ?? 'llama-3.3-70b-versatile';
    const groqTemperature = parseFloat(
      this.configService.get<string>('AI_TEMPERATURE') ?? '0.3',
    );
    const groqMaxTokens = parseInt(
      this.configService.get<string>('AI_MAX_TOKENS') ?? '2048',
      10,
    );

    const claudeApiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const claudeModel =
      this.configService.get<string>('CLAUDE_MODEL') ??
      'claude-3-5-sonnet-20241022';
    const claudeMaxTokens = parseInt(
      this.configService.get<string>('AI_MAX_TOKENS') ?? '2048',
      10,
    );

    const geminiApiKey = this.configService.get<string>('GEMINI_API_KEY');
    const geminiModel =
      this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash';

    const allProviders: Record<LlmProviderName, LlmProvider> = {
      groq: new GroqProvider(
        groqApiKey,
        groqModel,
        groqTemperature,
        groqMaxTokens,
      ),
      claude: new ClaudeProvider(claudeApiKey, claudeModel, claudeMaxTokens),
      gemini: new GeminiProvider(geminiApiKey, geminiModel),
    };

    // ── Build ordered chain from env ───────────────────────────────────────
    const primaryName =
      (this.configService.get<string>('PRIMARY_LLM') as LlmProviderName) ??
      'groq';
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
          'GROQ_API_KEY (groq), ANTHROPIC_API_KEY (claude), GEMINI_API_KEY (gemini).',
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
      this.logBus.emit({
        type: 'ERROR',
        component: 'LlmService',
        message: `[${label}] No LLM providers configured — request rejected`,
      });
      throw new ServiceUnavailableException(
        'No LLM providers are configured. Set AWS credentials, ANTHROPIC_API_KEY, or GEMINI_API_KEY.',
      );
    }

    for (const provider of this.providerChain) {
      const start = Date.now();
      this.logBus.emit({
        type: 'LLM',
        component: 'LlmService',
        message: `[${label}] Invoking provider: ${provider.name}`,
        meta: { label, provider: provider.name },
      });
      try {
        const result = await provider.generate(messages, systemPrompt);
        const latencyMs = Date.now() - start;
        this.logger.log(
          `[${label}] Using provider: ${provider.name} (${latencyMs}ms)`,
        );
        this.logBus.emit({
          type: 'LLM',
          component: 'LlmService',
          message: `[${label}] Response from ${provider.name} in ${latencyMs}ms`,
          meta: { label, provider: provider.name, latencyMs },
        });
        this.lastUsedProvider = provider.name;
        return result;
      } catch (err) {
        const latencyMs = Date.now() - start;
        const nextProvider =
          this.providerChain[this.providerChain.indexOf(provider) + 1];
        if (nextProvider) {
          this.logger.warn(
            `[${label}] ${provider.name} failed after ${latencyMs}ms (${(err as Error).message}), ` +
              `trying ${nextProvider.name}`,
          );
          this.logBus.emit({
            type: 'WARN',
            component: 'LlmService',
            message: `[${label}] ${provider.name} failed (${latencyMs}ms) — falling back to ${nextProvider.name}`,
            meta: {
              label,
              provider: provider.name,
              fallback: nextProvider.name,
              latencyMs,
            },
          });
        } else {
          this.logger.error(
            `[${label}] All providers failed. Last error from ${provider.name}: ${(err as Error).message}`,
          );
          this.logBus.emit({
            type: 'ERROR',
            component: 'LlmService',
            message: `[${label}] All LLM providers failed. Last: ${provider.name} — ${(err as Error).message}`,
            meta: { label, provider: provider.name, latencyMs },
          });
        }
      }
    }

    throw new ServiceUnavailableException(
      `LLM unavailable for "${label}". All configured providers (groq, claude, gemini) failed.`,
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

  // ─── Copilot Methods ──────────────────────────────────────────────────────

  /**
   * Extracts structured career intelligence from a plain-text resume.
   * Returns a `CareerIntelligence` object with experience level, skills,
   * industries, strengths, improvement areas, career paths, and a professional
   * summary — ready to be persisted in the `careerIntelligence` column on
   * `UserProfile`.
   *
   * @param resumeText - Raw resume text (truncated to 6 000 chars).
   * @returns Structured `CareerIntelligence` profile.
   */
  async extractCareerIntelligence(resumeText: string): Promise<{
    experience_level: string;
    top_skills: string[];
    industries: string[];
    strengths: string[];
    improvement_areas: string[];
    career_paths: string[];
    professional_summary: string;
    analyzed_at: string;
  }> {
    const systemPrompt =
      'You are a senior career strategist specialising in Singapore tech sector talent. ' +
      'Analyse resumes deeply and respond ONLY in the exact JSON format requested. ' +
      'Be specific, professional, and grounded in Singapore labour market context.';

    const userPrompt =
      `Analyse this resume thoroughly and extract a structured career intelligence profile.\n\n` +
      `Resume:\n${resumeText.substring(0, 6000)}\n\n` +
      `Respond ONLY with this JSON (no markdown, no explanation):\n` +
      `{\n` +
      `  "experience_level": "junior|mid-level|senior|executive",\n` +
      `  "top_skills": ["skill1", "skill2", ...],\n` +
      `  "industries": ["industry1", ...],\n` +
      `  "strengths": ["strength1", "strength2", ...],\n` +
      `  "improvement_areas": ["area1", "area2", ...],\n` +
      `  "career_paths": ["path1", "path2", "path3"],\n` +
      `  "professional_summary": "2-4 sentence professional narrative"\n` +
      `}\n` +
      `Be precise. Base career_paths on Singapore market demand.`;

    const raw = await this.withFallback(
      'extractCareerIntelligence',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    const cleaned = jsonMatch[1].trim();
    const parsed = JSON.parse(cleaned);
    return {
      ...parsed,
      analyzed_at: new Date().toISOString(),
    };
  }

  /**
   * Generates a structured 12-month career transition plan.
   *
   * @param profileSummary - Brief summary of the candidate's background.
   * @param targetRole - Target job role the plan leads toward.
   * @param currentSkills - Skills the candidate currently possesses.
   * @param months - Duration of the plan (default: 12).
   * @returns A `CareerPlan` with monthly milestones and Singapore-specific resources.
   */
  async generateCareerPlan(
    profileSummary: string,
    targetRole: string,
    currentSkills: string[],
    months: number = 12,
  ): Promise<{
    target_role: string;
    total_months: number;
    milestones: Array<{
      month: number;
      title: string;
      actions: string[];
      outcome: string;
    }>;
    key_resources: string[];
    singapore_programmes: string[];
  }> {
    const systemPrompt =
      'You are an expert Singapore career transition strategist. ' +
      'Create actionable plans grounded in real SkillsFuture, WSG, and SCTP programmes. ' +
      'Respond ONLY in the exact JSON format requested.';

    const userPrompt =
      `Create a ${months}-month career transition plan.\n\n` +
      `Profile: ${profileSummary}\n` +
      `Current skills: ${currentSkills.join(', ')}\n` +
      `Target role: ${targetRole}\n\n` +
      `Respond ONLY with this JSON (no markdown):\n` +
      `{\n` +
      `  "target_role": "${targetRole}",\n` +
      `  "total_months": ${months},\n` +
      `  "milestones": [\n` +
      `    { "month": 1, "title": "...", "actions": ["action1", "action2"], "outcome": "..." },\n` +
      `    ... (one object per month, grouped into logical phases)\n` +
      `  ],\n` +
      `  "key_resources": ["resource1", ...],\n` +
      `  "singapore_programmes": ["SkillsFuture ...", "SCTP ...", "WSG ..."]\n` +
      `}\n` +
      `Group milestones into phases: Foundation (months 1-3), Development (4-8), Transition (9-12). ` +
      `Be specific and actionable.`;

    const raw = await this.withFallback(
      'generateCareerPlan',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    return JSON.parse(jsonMatch[1].trim());
  }

  /**
   * Generates targeted resume improvement tips for a given candidate and role.
   *
   * @param resumeText - Raw resume text (truncated to 4 000 chars).
   * @param targetRole - Target role for contextual tips.
   * @returns Array of specific, actionable improvement tips.
   */
  async generateResumeTips(
    resumeText: string,
    targetRole?: string,
  ): Promise<string[]> {
    const systemPrompt =
      'You are a professional resume coach specialising in Singapore tech roles. ' +
      'Respond ONLY in the JSON array format requested.';

    const roleCtx = targetRole
      ? `The candidate is targeting a ${targetRole} role.`
      : 'Focus on general improvements for Singapore tech market.';

    const userPrompt =
      `Review this resume and provide specific improvement tips.\n\n` +
      `${roleCtx}\n\n` +
      `Resume:\n${resumeText.substring(0, 4000)}\n\n` +
      `Respond ONLY with a JSON array of 6–8 specific, actionable tips. No markdown.\n` +
      `Example: ["Quantify impact in bullet points (e.g. reduced costs by 30%)", ...]`;

    const raw = await this.withFallback(
      'generateResumeTips',
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
    return JSON.parse(jsonMatch[1].trim());
  }
}
