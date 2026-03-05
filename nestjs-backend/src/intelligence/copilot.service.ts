/**
 * @file copilot.service.ts
 * @description AI Career Copilot service — provides enriched career intelligence
 * built on top of the existing `IntelligenceService`, `LlmService`, and `RagService`.
 *
 * This service is the primary orchestration layer for the Copilot feature:
 * - Phase 1: Profile extraction from resume text
 * - Phase 2: Enriched copilot chat with full context injection
 * - Phase 3: Structured career analysis commands
 * - Phase 4: 12-month career plan generation
 * - Phase 5: Resume improvement tips
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UserProfile } from '@app/entities/user-profile.entity';
import { LlmService } from './llm.service';
import { RagService } from '../rag/rag.service';
import type {
  CareerIntelligence,
  CareerPlan,
} from './dto/copilot.dto';

/**
 * Builds the provider label displayed in the UI.
 *
 * @param provider - Raw provider name from LlmService.
 * @returns Human-readable engine label.
 */
function providerLabel(provider: string | null): string {
  const map: Record<string, string> = {
    groq: 'Groq',
    claude: 'Anthropic Claude',
    gemini: 'Google Gemini',
  };
  return map[provider ?? ''] ?? 'LLM Router';
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
    private readonly llmService: LlmService,
    private readonly ragService: RagService,
  ) {}

  // ─── Phase 1: Profile Extraction ─────────────────────────────────────────

  /**
   * Extracts and persists structured career intelligence from the user's stored
   * resume text. On subsequent calls, returns cached intelligence unless `force`
   * is set to `true`.
   *
   * @param profileId - ID of the `UserProfile` to analyse.
   * @param tenantId - Tenant scope.
   * @param force - Re-analyse even if intelligence already exists.
   * @returns Extracted `CareerIntelligence` and extraction metadata.
   */
  async extractCareerProfile(
    profileId: number,
    tenantId: number,
    force = false,
  ): Promise<{ intelligence: CareerIntelligence; fresh: boolean; engine: string }> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });

    if (!profile) throw new NotFoundException('Profile not found');

    // Return cached intelligence unless force refresh requested
    if (profile.careerIntelligence && !force) {
      return {
        intelligence: profile.careerIntelligence,
        fresh: false,
        engine: 'cached',
      };
    }

    const resumeText = profile.resumeText ?? '';
    if (!resumeText.trim()) {
      throw new NotFoundException(
        'No resume text found on this profile. Please upload a resume first.',
      );
    }

    this.logger.log(`Extracting career intelligence for profile ${profileId}`);

    const intelligence = await this.llmService.extractCareerIntelligence(resumeText);

    // Persist the extracted intelligence back to the profile
    profile.careerIntelligence = intelligence as CareerIntelligence;
    await this.profileRepository.getEntityManager().flush();

    return {
      intelligence: intelligence as CareerIntelligence,
      fresh: true,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }

  // ─── Phase 2: Enriched Copilot Chat ──────────────────────────────────────

  /**
   * Sends a chat message through the enriched Copilot context pipeline.
   *
   * Constructs a rich system prompt containing:
   * 1. Career strategist role definition
   * 2. Structured career intelligence (if available)
   * 3. RAG-retrieved resume/document chunks relevant to the query
   * 4. Singapore-specific career guidance directives
   *
   * @param profileId - Optional profile ID for context injection.
   * @param messages - Conversation history.
   * @param tenantId - Tenant scope.
   * @returns AI reply and active engine label.
   */
  async copilotChat(
    profileId: number | undefined,
    messages: Array<{ role: string; content: string }>,
    tenantId: number,
  ): Promise<{ reply: string; engine: string }> {
    let intelligenceContext = '';
    let ragContext = '';

    if (profileId) {
      const profile = await this.profileRepository.findOne({
        id: profileId,
        tenant: tenantId,
      });

      if (profile?.careerIntelligence) {
        const ci = profile.careerIntelligence;
        intelligenceContext =
          `\n\nUSER CAREER PROFILE:\n` +
          `Experience Level: ${ci.experience_level}\n` +
          `Top Skills: ${ci.top_skills.join(', ')}\n` +
          `Industries: ${ci.industries.join(', ')}\n` +
          `Strengths: ${ci.strengths.join(', ')}\n` +
          `Improvement Areas: ${ci.improvement_areas.join(', ')}\n` +
          `Recommended Paths: ${ci.career_paths.join(', ')}\n` +
          `Professional Summary: ${ci.professional_summary}`;
      } else if (profile) {
        // Fallback to basic profile context if CI not yet extracted
        intelligenceContext =
          `\n\nUSER PROFILE: Skills: ${(profile.skills ?? []).join(', ')}, ` +
          `Experience: ${profile.yearsExperience ?? 0} years, ` +
          `Career switcher: ${profile.isCareerSwitcher}.`;
      }

      // Retrieve relevant RAG chunks for the last user message
      try {
        const lastUserMsg = [...messages]
          .reverse()
          .find((m) => m.role === 'user');
        if (lastUserMsg) {
          const chunks = await this.ragService.query(
            lastUserMsg.content,
            tenantId,
            { topK: 4, threshold: 0.45, profileId },
          );
          ragContext = RagService.formatContext(chunks);
        }
      } catch {
        // RAG enrichment is best-effort
      }
    }

    const systemPrompt =
      `You are SkillBridge Copilot — an expert AI career strategist and mentor ` +
      `specialising in Singapore's tech sector, SCTP programmes, SkillsFuture, and WSG career guidance.\n\n` +
      `Your role is to act as a long-term career advisor who deeply understands the user's background. ` +
      `Provide professional, specific, and actionable career guidance. ` +
      `Be encouraging yet honest about gaps. Reference Singapore-specific programmes where relevant.\n` +
      `Format structured responses clearly with sections, bullet points, or numbered lists as appropriate.` +
      intelligenceContext +
      ragContext;

    const reply = await this.llmService.chat(
      messages as Array<{ role: string; content: string }>,
      systemPrompt,
    );

    return {
      reply,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }

  // ─── Phase 3: Career Analysis ─────────────────────────────────────────────

  /**
   * Generates a comprehensive career analysis report for the given profile.
   * Returns formatted markdown-like structured text ready for display.
   *
   * @param profileId - Profile to analyse.
   * @param tenantId - Tenant scope.
   * @returns Structured analysis report text and engine used.
   */
  async analyzeCareer(
    profileId: number,
    tenantId: number,
  ): Promise<{ analysis: string; intelligence: CareerIntelligence | null; engine: string }> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });
    if (!profile) throw new NotFoundException('Profile not found');

    // Auto-extract if not done yet
    let ci = profile.careerIntelligence;
    if (!ci && profile.resumeText) {
      const extracted = await this.extractCareerProfile(profileId, tenantId);
      ci = extracted.intelligence;
    }

    if (!ci) {
      return {
        analysis:
          'No career intelligence available. Please upload a resume and run ANALYZE_CAREER first.',
        intelligence: null,
        engine: 'none',
      };
    }

    const systemPrompt =
      'You are a senior Singapore career strategist producing a premium career intelligence report.';

    const userPrompt =
      `Based on this career intelligence profile, write a comprehensive career analysis report.\n\n` +
      `Career Intelligence:\n${JSON.stringify(ci, null, 2)}\n\n` +
      `Structure the report with these sections:\n` +
      `1. PROFESSIONAL PROFILE — 3-4 sentence summary\n` +
      `2. EXPERIENCE ASSESSMENT — level, years context, maturity\n` +
      `3. TOP SKILLS — with brief commentary on each\n` +
      `4. STRENGTHS — what sets this person apart\n` +
      `5. DEVELOPMENT AREAS — specific and constructive\n` +
      `6. RECOMMENDED CAREER PATHS — 3 paths with rationale\n` +
      `7. NEXT STEPS — 3 immediate actions to take this week\n\n` +
      `Use clear headers (e.g. "## PROFESSIONAL PROFILE"), bullet points, and professional language. ` +
      `Singapore context: mention SkillsFuture, SCTP, WSG where relevant.`;

    const analysis = await this.llmService.chat(
      [{ role: 'user', content: userPrompt }],
      systemPrompt,
    );

    return {
      analysis,
      intelligence: ci,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }

  // ─── Phase 4: Career Plan ─────────────────────────────────────────────────

  /**
   * Generates a structured 12-month career transition plan.
   *
   * @param profileId - Profile to plan for.
   * @param targetRole - Target role (defaults to first recommended career path).
   * @param months - Plan duration (default: 12).
   * @param tenantId - Tenant scope.
   * @returns Structured `CareerPlan` and active engine.
   */
  async generateCareerPlan(
    profileId: number,
    tenantId: number,
    targetRole?: string,
    months = 12,
  ): Promise<{ plan: CareerPlan; engine: string }> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const ci = profile.careerIntelligence;
    const resolvedTarget =
      targetRole ?? ci?.career_paths?.[0] ?? 'Software Engineer';

    const profileSummary = ci
      ? `${ci.experience_level} professional. Strengths: ${ci.strengths.join(', ')}. ` +
        `Industries: ${ci.industries.join(', ')}.`
      : `Skills: ${(profile.skills ?? []).join(', ')}. ` +
        `Experience: ${profile.yearsExperience ?? 0} years.`;

    const plan = await this.llmService.generateCareerPlan(
      profileSummary,
      resolvedTarget,
      profile.skills ?? [],
      months,
    );

    return {
      plan: plan as CareerPlan,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }

  // ─── Phase 5: Resume Tips ─────────────────────────────────────────────────

  /**
   * Generates targeted resume improvement tips.
   *
   * @param profileId - Profile to analyse.
   * @param tenantId - Tenant scope.
   * @param targetRole - Optional target role for contextual advice.
   * @returns Array of tips and active engine label.
   */
  async getResumeTips(
    profileId: number,
    tenantId: number,
    targetRole?: string,
  ): Promise<{ tips: string[]; engine: string }> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const resumeText = profile.resumeText ?? '';
    if (!resumeText.trim()) {
      return {
        tips: [
          'No resume text found. Please upload your resume to receive personalised tips.',
        ],
        engine: 'none',
      };
    }

    const resolvedRole =
      targetRole ?? profile.careerIntelligence?.career_paths?.[0];

    const tips = await this.llmService.generateResumeTips(resumeText, resolvedRole);

    return {
      tips,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }
}
