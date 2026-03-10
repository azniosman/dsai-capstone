import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UserProfile } from '@app/entities/user-profile.entity';
import { JobRole } from '@app/entities/job-role.entity';
import { ChatRequestDto, RecommendRequestDto } from './dto/intelligence.dto';
import { LlmService, providerLabel } from './llm.service';
import { ResumeParser } from '../common/utils/resume-parser.util';
import { DomainService } from '../domain/domain.service';
import { RagService } from '../rag/rag.service';
import { RagPipelineService } from '../rag/rag-pipeline.service';

@Injectable()
export class IntelligenceService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
    @InjectRepository(JobRole)
    private readonly roleRepository: EntityRepository<JobRole>,
    private readonly llmService: LlmService,
    private readonly domainService: DomainService,
    private readonly ragService: RagService,
    private readonly ragPipelineService: RagPipelineService,
  ) {}

  // Shared hybrid scoring: 0.55 × content + 0.25 × rule + 0.20 × career bonus
  private scoreRole(
    profile: UserProfile,
    role: JobRole,
  ): {
    score: number;
    contentScore: number;
    ruleScore: number;
    careerBonus: number;
    matched: string[];
    missing: string[];
  } {
    const profileSkills = new Set(
      (profile.skills ?? []).map((s) => s.toLowerCase()),
    );
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of role.requiredSkills) {
      if (profileSkills.has(req.toLowerCase())) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const contentScore =
      matched.length / Math.max(role.requiredSkills.length, 1);
    const ruleScore =
      (profile.yearsExperience ?? 0) >= role.minExperienceYears ? 1.0 : 0.5;
    const careerBonus =
      profile.isCareerSwitcher && role.careerSwitcherFriendly ? 1.0 : 0.0;
    const score = 0.55 * contentScore + 0.25 * ruleScore + 0.2 * careerBonus;

    return { score, contentScore, ruleScore, careerBonus, matched, missing };
  }

  private buildRationale(
    role: JobRole,
    contentScore: number,
    ruleScore: number,
    careerBonus: number,
    matchedCount: number,
    missingCount: number,
  ): string {
    const pct = Math.round(
      (0.55 * contentScore + 0.25 * ruleScore + 0.2 * careerBonus) * 100,
    );
    const parts: string[] = [];
    parts.push(
      `You match ${matchedCount} of ${matchedCount + missingCount} required skills (${Math.round(contentScore * 100)}% skill coverage).`,
    );
    if (ruleScore >= 1.0) {
      parts.push(
        `Your experience level meets the minimum requirement for this role.`,
      );
    } else {
      parts.push(
        `You are slightly below the recommended experience level — consider entry-level positions or upskilling first.`,
      );
    }
    if (careerBonus > 0) {
      parts.push(
        `This role is career-switcher friendly, boosting your overall fit score.`,
      );
    }
    if (missingCount === 0) {
      parts.push(
        `You have all required skills — focus on preferred skills to stand out.`,
      );
    } else if (missingCount <= 2) {
      parts.push(
        `With ${missingCount} skill${missingCount > 1 ? 's' : ''} to bridge, you are close to full readiness.`,
      );
    }
    parts.push(`Overall fit: ${pct}%.`);
    return parts.join(' ');
  }

  private qualityLabel(score: number): 'strong' | 'moderate' | 'developing' {
    if (score >= 0.7) return 'strong';
    if (score >= 0.4) return 'moderate';
    return 'developing';
  }

  async chat(payload: ChatRequestDto, tenantId: number): Promise<any> {
    const traceId = `rag_${Math.random().toString(36).substring(2, 10)}`;
    const ctx = this.ragPipelineService.createContext(traceId);

    // 1. User Query
    const lastUserMsg = [...payload.messages]
      .reverse()
      .find((m) => m.role === 'user');
    await this.ragPipelineService.runStep(
      ctx,
      'User Query',
      // eslint-disable-next-line @typescript-eslint/require-await
      async () => lastUserMsg?.content,
      {
        metadata: { role: 'user', msg_length: lastUserMsg?.content.length },
      },
    );

    const profileId = payload.profile_id ?? payload.profileId;
    let profileContext = '';
    if (profileId) {
      const profile = await this.profileRepository.findOne({
        id: profileId,
        tenant: tenantId,
      });
      if (profile) {
        profileContext = `Name: ${profile.name}, Skills: ${(profile.skills ?? []).join(', ')}, Experience: ${profile.yearsExperience ?? 0} years.`;
      }
    }

    let ragContext = '';

    // 2–5. Embedding → Vector DB Search → Document Retrieval → Context Builder
    if (lastUserMsg && !ctx.hasCriticalFailure) {
      try {
        // Emit discrete steps first so the timeline reflects the correct logical order
        await this.ragPipelineService.runStep(
          ctx,
          'Embedding',
          async () => {},
          {
            metadata: { status: 'bundled inside retrieval' },
            maxRetries: 1,
            isCritical: false,
          },
        );
        await this.ragPipelineService.runStep(
          ctx,
          'Vector DB Search',
          async () => {},
          {
            metadata: { status: 'bundled inside retrieval' },
            maxRetries: 1,
            isCritical: false,
          },
        );

        const chunks = await this.ragPipelineService.runStep(
          ctx,
          'Document Retrieval',
          async () => {
            return this.ragService.query(lastUserMsg.content, tenantId, {
              topK: 3,
              threshold: 0.5,
              profileId,
            });
          },
          { maxRetries: 2, isCritical: false, metadata: { tenantId } },
        );

        // Always emit Context Builder so the canvas node activates regardless of chunk count
        ragContext =
          (await this.ragPipelineService.runStep(
            ctx,
            'Context Builder',
            // eslint-disable-next-line @typescript-eslint/require-await
            async () => {
              return chunks && chunks.length > 0
                ? RagService.formatContext(chunks)
                : '';
            },
            {
              maxRetries: 1,
              isCritical: false,
              metadata: { count: chunks?.length ?? 0 },
            },
          )) || '';
      } catch {
        // Enforce fault tolerance. Failed search doesn't kill chat payload.
      }
    }

    const systemPrompt =
      `You are SkillBridge, a Singapore career coach for SCTP learners. ` +
      `Be concise, encouraging, and practical. ` +
      (profileContext ? ` Profile context: ${profileContext}` : '') +
      ragContext;

    // 6. LLM Engine
    const reply =
      (await this.ragPipelineService.runStep(
        ctx,
        'LLM Engine',
        async () => {
          return this.llmService.chat(payload.messages, systemPrompt);
        },
        { maxRetries: 3 },
      )) || 'I am currently overloaded with requests. Please try again soon.';

    // 7. Response
    await this.ragPipelineService.runStep(
      ctx,
      'Response',
      // eslint-disable-next-line @typescript-eslint/require-await
      async () => reply,
      {
        metadata: {
          provider: providerLabel(this.llmService.getLastUsedProvider()),
        },
      },
    );

    return {
      reply,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }

  async getRecommendations(
    payload: RecommendRequestDto,
    tenantId: number,
  ): Promise<any> {
    const profileId = payload.profile_id ?? payload.profileId;
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const roles = await this.roleRepository.find(
      { tenant: tenantId },
      { limit: 200 },
    );
    const scored = roles
      .map((role) => {
        const {
          score,
          contentScore,
          ruleScore,
          careerBonus,
          matched,
          missing,
        } = this.scoreRole(profile, role);
        return {
          role_id: role.id,
          title: role.title,
          category: role.category,
          salary_range: role.salaryRange,
          match_score: parseFloat(score.toFixed(3)),
          content_score: parseFloat(contentScore.toFixed(3)),
          rule_score: parseFloat(ruleScore.toFixed(3)),
          career_switcher_bonus: parseFloat(careerBonus.toFixed(3)),
          skill_match_quality: this.qualityLabel(score),
          career_switcher_friendly: role.careerSwitcherFriendly,
          missing_skills: missing,
          matched_skills: matched,
          rationale: this.buildRationale(
            role,
            contentScore,
            ruleScore,
            careerBonus,
            matched.length,
            missing.length,
          ),
        };
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);

    // Enhance top 3 with LLM-generated rationale (non-blocking)
    try {
      const top3 = scored.slice(0, 3);
      const profileSummary = `Skills: ${(profile.skills ?? []).join(', ')}. Experience: ${profile.yearsExperience ?? 0} years. Career switcher: ${profile.isCareerSwitcher}.`;
      const aiRationales = await this.llmService.generateRationale(
        profileSummary,
        top3.map((r) => ({
          title: r.title,
          matchScore: r.match_score,
          matched: r.matched_skills,
          missing: r.missing_skills,
        })),
      );
      for (let i = 0; i < Math.min(aiRationales.length, top3.length); i++) {
        scored[i].rationale = aiRationales[i];
      }
    } catch {
      // Keep template rationales on LLM failure
    }

    return scored;
  }

  async getSkillGap(profileId: number, tenantId: number): Promise<any> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const roles = await this.roleRepository.find(
      { tenant: tenantId },
      { limit: 200 },
    );
    const top3 = roles
      .map((role) => ({ role, ...this.scoreRole(profile, role) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const SEV_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

    const results = top3.map(({ role, score }) => {
      const profileSkillsLower = new Set(
        (profile.skills ?? []).map((s) => s.toLowerCase()),
      );

      const allGaps = [
        ...role.requiredSkills
          .map((skill) => {
            if (profileSkillsLower.has(skill.toLowerCase())) return null;
            return {
              skill,
              gap_severity: 'high',
              required_level: 'required',
              user_level: 0,
              user_level_label: 'Missing',
              priority: 'high',
              ai_advice: '',
            };
          })
          .filter(Boolean),
        ...role.preferredSkills
          .map((skill) => {
            if (profileSkillsLower.has(skill.toLowerCase())) return null;
            return {
              skill,
              gap_severity: 'low',
              required_level: 'preferred',
              user_level: 0,
              user_level_label: 'Missing',
              priority: 'low',
              ai_advice: '',
            };
          })
          .filter(Boolean),
      ] as any[];

      // Sort by severity descending, show top 5
      const gaps = allGaps
        .sort(
          (a, b) =>
            (SEV_ORDER[b.gap_severity] ?? 0) - (SEV_ORDER[a.gap_severity] ?? 0),
        )
        .slice(0, 5);

      return {
        role_title: role.title,
        match_score: parseFloat(score.toFixed(3)),
        gaps,
      };
    });

    // Enhance gaps with LLM-generated advice — all 3 roles fire concurrently.
    // Promise.allSettled ensures one provider failure doesn't block the others.
    const adviceResults = await Promise.allSettled(
      results.map((entry) => {
        if (entry.gaps.length === 0) return Promise.resolve([]);
        return this.llmService.generateSkillGapAdvice(
          entry.role_title,
          entry.gaps.map((g: any) => ({
            skill: g.skill,
            gap_severity: g.gap_severity,
          })),
        );
      }),
    );

    for (let r = 0; r < results.length; r++) {
      const settled = adviceResults[r];
      if (settled.status === 'fulfilled') {
        const advice = settled.value;
        for (
          let i = 0;
          i < Math.min(advice.length, results[r].gaps.length);
          i++
        ) {
          results[r].gaps[i].ai_advice = advice[i];
        }
      }
      // On rejection: gaps retain empty ai_advice — already initialised above
    }

    return results;
  }

  async parseResume(text: string): Promise<any> {
    // Try LLM-powered parsing first, fall back to regex
    try {
      const llmResult = await this.llmService.parseResume(text);
      return {
        ...llmResult,
        resume_text: text,
        raw_text_preview: text.substring(0, 500),
      };
    } catch {
      // Regex fallback
      const skills = ResumeParser.extractSkills(text);
      const emailMatch = text.match(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      );
      const phoneMatch = text.match(
        /[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}/,
      );
      const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/m);

      return {
        name: nameMatch ? nameMatch[1] : 'Extracted User',
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0] : '',
        skills,
        experience_years: text.includes('years') ? 5 : 0,
        resume_text: text,
        raw_text_preview: text.substring(0, 500),
      };
    }
  }

  async rewriteResume(
    bullet: string,
    targetRole: string,
  ): Promise<{ rewritten_bullet: string; engine: string }> {
    const prompt = `Rewrite this resume bullet to be stronger and more relevant for a ${targetRole} role. Return only the rewritten bullet, no explanation.\n\nOriginal: ${bullet}`;
    const reply = await this.llmService.chat(
      [{ role: 'user', content: prompt }],
      'You are a professional resume writer specialising in tech roles in Singapore.',
    );
    return {
      rewritten_bullet: reply.trim(),
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }

  async interview(
    dto: {
      profile_id?: number;
      job_title: string;
      messages: Array<{ role: string; content: string }>;
    },
    tenantId: number,
  ): Promise<{ reply: string; engine: string }> {
    let profileContext = '';
    if (dto.profile_id) {
      const profile = await this.profileRepository.findOne({
        id: dto.profile_id,
        tenant: tenantId,
      });
      if (profile) {
        profileContext = ` The candidate's skills include: ${(profile.skills ?? []).join(', ')}.`;
      }
    }

    // Augment with RAG context if available
    let ragContext = '';
    try {
      const lastUserMsg = [...dto.messages]
        .reverse()
        .find((m) => m.role === 'user');
      if (lastUserMsg) {
        const chunks = await this.ragService.query(
          lastUserMsg.content,
          tenantId,
          {
            topK: 2,
            threshold: 0.5,
          },
        );
        ragContext = RagService.formatContext(chunks);
      }
    } catch {
      // RAG enrichment is best-effort
    }

    const systemPrompt =
      `You are a professional interviewer conducting a mock interview for a ${dto.job_title} position.` +
      ` Ask one focused question at a time, provide constructive feedback, and help the candidate improve.` +
      ` Singapore tech industry context: SkillsFuture, SCTP programmes, WSG career guidance.` +
      profileContext +
      ragContext;

    const reply = await this.llmService.chat(
      dto.messages as Array<{ role: string; content: string }>,
      systemPrompt,
    );
    return {
      reply,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
    };
  }

  async analyzeJdMatch(
    profileId: number,
    jobDescription: string,
    jobTitle: string | undefined,
    tenantId: number,
  ): Promise<any> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const profileSkills = profile.skills ?? [];
    let extractedSkills: string[];
    let matchScore: number;
    let gapSkills: string[];

    try {
      const result = await this.llmService.analyzeJobDescription(
        jobDescription,
        profileSkills,
      );
      extractedSkills = result.extracted_skills;
      matchScore = result.match_score;
      gapSkills = result.gaps;
    } catch {
      extractedSkills = ResumeParser.extractSkills(jobDescription);
      const profileSet = new Set(profileSkills.map((s) => s.toLowerCase()));
      const matched = extractedSkills.filter((s) =>
        profileSet.has(s.toLowerCase()),
      );
      matchScore =
        extractedSkills.length > 0
          ? matched.length / extractedSkills.length
          : 0;
      gapSkills = extractedSkills.filter(
        (s) => !profileSet.has(s.toLowerCase()),
      );
    }

    const gaps = gapSkills.map((skill) => ({
      skill,
      user_level: 0,
      gap_severity: 'high',
      required_level: 'required',
      user_level_label: 'Missing',
      priority: 'high',
    }));

    return {
      job_title: jobTitle ?? 'Analysed Role',
      match_score: parseFloat(matchScore.toFixed(3)),
      extracted_skills: extractedSkills,
      gaps,
    };
  }
}
