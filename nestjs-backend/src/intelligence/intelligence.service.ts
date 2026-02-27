import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository } from '@mikro-orm/postgresql';
import { UserProfile } from '@app/entities/user-profile.entity';
import { JobRole } from '@app/entities/job-role.entity';
import { ChatRequestDto, RecommendRequestDto } from './dto/intelligence.dto';
import { InterviewRequestDto } from './dto/interview.dto';
import { LlmService } from './llm.service';
import { ResumeParser } from '../common/utils/resume-parser.util';

@Injectable()
export class IntelligenceService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: EntityRepository<UserProfile>,
    @InjectRepository(JobRole)
    private readonly roleRepository: EntityRepository<JobRole>,
    private readonly llmService: LlmService,
  ) {}

  // Shared hybrid scoring: 0.55 × content + 0.25 × rule + 0.20 × career bonus
  private scoreRole(
    profile: UserProfile,
    role: JobRole,
  ): { score: number; contentScore: number; ruleScore: number; careerBonus: number; matched: string[]; missing: string[] } {
    const profileSkills = new Set((profile.skills ?? []).map((s) => s.toLowerCase()));
    const matched: string[] = [];
    const missing: string[] = [];

    for (const req of role.requiredSkills) {
      if (profileSkills.has(req.toLowerCase())) {
        matched.push(req);
      } else {
        missing.push(req);
      }
    }

    const contentScore = matched.length / Math.max(role.requiredSkills.length, 1);
    const ruleScore = (profile.yearsExperience ?? 0) >= role.minExperienceYears ? 1.0 : 0.5;
    const careerBonus = profile.isCareerSwitcher && role.careerSwitcherFriendly ? 1.0 : 0.0;
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
    const pct = Math.round((0.55 * contentScore + 0.25 * ruleScore + 0.2 * careerBonus) * 100);
    const parts: string[] = [];
    parts.push(
      `You match ${matchedCount} of ${matchedCount + missingCount} required skills (${Math.round(contentScore * 100)}% skill coverage).`,
    );
    if (ruleScore >= 1.0) {
      parts.push(`Your experience level meets the minimum requirement for this role.`);
    } else {
      parts.push(`You are slightly below the recommended experience level — consider entry-level positions or upskilling first.`);
    }
    if (careerBonus > 0) {
      parts.push(`This role is career-switcher friendly, boosting your overall fit score.`);
    }
    if (missingCount === 0) {
      parts.push(`You have all required skills — focus on preferred skills to stand out.`);
    } else if (missingCount <= 2) {
      parts.push(`With ${missingCount} skill${missingCount > 1 ? 's' : ''} to bridge, you are close to full readiness.`);
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
    const profileId = payload.profile_id ?? payload.profileId;
    let profileContext = '';
    if (profileId) {
      const profile = await this.profileRepository.findOne({ id: profileId, tenant: tenantId });
      if (profile) {
        profileContext = `Name: ${profile.name}, Skills: ${(profile.skills ?? []).join(', ')}, Experience: ${profile.yearsExperience ?? 0} years, Career switcher: ${profile.isCareerSwitcher}.`;
      }
    }

    const systemPrompt =
      `You are SkillBridge, a Singapore career coach for SCTP learners and career-switchers. ` +
      `You help users identify skill gaps, recommend courses, and plan career transitions in Singapore's tech sector. ` +
      `Be concise, encouraging, and practical. Singapore context: SkillsFuture Credit, MCES, WSG programmes.` +
      (profileContext ? ` User profile context: ${profileContext}` : '');

    const reply = await this.llmService.chat(payload.messages, systemPrompt);
    return {
      reply,
      engine: 'Google Gemini (gemini-2.0-flash)',
    };
  }

  async getRecommendations(payload: RecommendRequestDto, tenantId: number): Promise<any> {
    const profileId = payload.profile_id ?? payload.profileId;
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const roles = await this.roleRepository.find({ tenant: tenantId });
    const scored = roles
      .map((role) => {
        const { score, contentScore, ruleScore, careerBonus, matched, missing } = this.scoreRole(profile, role);
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
          rationale: this.buildRationale(role, contentScore, ruleScore, careerBonus, matched.length, missing.length),
        };
      })
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 10);

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

    const roles = await this.roleRepository.find({ tenant: tenantId });
    const top3 = roles
      .map((role) => ({ role, ...this.scoreRole(profile, role) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const SEV_ORDER: Record<string, number> = { high: 3, medium: 2, low: 1 };

    return top3.map(({ role, score }) => {
      const profileSkillsLower = new Set((profile.skills ?? []).map((s) => s.toLowerCase()));

      const allGaps = [
        ...role.requiredSkills
          .map((skill, idx) => {
            if (profileSkillsLower.has(skill.toLowerCase())) return null;
            return {
              skill,
              gap_severity: idx < 3 ? 'high' : 'medium',
              required_level: 'required',
              user_level: 0,
              user_level_label: 'Missing',
              priority: idx < 3 ? 'high' : 'medium',
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
            };
          })
          .filter(Boolean),
      ] as any[];

      // Sort by severity descending, show top 5
      const gaps = allGaps
        .sort((a, b) => (SEV_ORDER[b.gap_severity] ?? 0) - (SEV_ORDER[a.gap_severity] ?? 0))
        .slice(0, 5);

      return {
        role_title: role.title,
        match_score: parseFloat(score.toFixed(3)),
        gaps,
      };
    });
  }

  async parseResume(text: string): Promise<any> {
    const skills = ResumeParser.extractSkills(text);

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/m);

    return {
      name: nameMatch ? nameMatch[1] : 'Extracted User',
      email: emailMatch ? emailMatch[0] : '',
      phone: phoneMatch ? phoneMatch[0] : '',
      skills,
      experience_years: text.includes('years') ? 5 : 0,
      raw_text_preview: text.substring(0, 500),
    };
  }

  async mockInterview(payload: InterviewRequestDto, tenantId: number): Promise<any> {
    const questionNum = Math.floor(payload.messages.length / 2) + 1;
    const isComplete = questionNum > 5;

    const roles = await this.roleRepository.find({ tenant: tenantId, title: payload.role_title });
    const targetRole = roles[0];
    const requiredSkills = targetRole?.requiredSkills ?? ['Communication', 'Problem Solving', 'Technical Skills'];
    const targetSkill = requiredSkills[(questionNum - 1) % requiredSkills.length];

    const result = await this.llmService.generateInterviewQuestion(
      payload.role_title,
      payload.difficulty,
      payload.messages,
      targetSkill,
      isComplete,
    );

    return {
      ...result,
      gap_targeted: true,
      target_skill: targetSkill,
      question_number: questionNum,
      is_complete: isComplete,
    };
  }

  async getPeerComparison(profileId: number, tenantId: number): Promise<any> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const roles = await this.roleRepository.find({ tenant: tenantId });
    const top3 = roles
      .map((role) => ({ role, ...this.scoreRole(profile, role) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const allProfiles = await this.profileRepository.find({ tenant: tenantId });
    const otherProfiles = allProfiles.filter((p) => p.id !== profileId);

    const peerInsights = top3.map(({ role }) => {
      const relevantPeers = otherProfiles.filter((p) =>
        (p.skills ?? []).some((s) =>
          role.requiredSkills.some((req) => req.toLowerCase() === s.toLowerCase()),
        ),
      );

      const totalPeers = relevantPeers.length;
      const avgSkillsCount =
        totalPeers > 0
          ? parseFloat(
              (relevantPeers.reduce((sum, p) => sum + (p.skills?.length ?? 0), 0) / totalPeers).toFixed(1),
            )
          : role.requiredSkills.length;
      const avgExperienceYears =
        totalPeers > 0
          ? parseFloat(
              (
                relevantPeers.reduce((sum, p) => sum + (p.yearsExperience ?? 0), 0) / totalPeers
              ).toFixed(1),
            )
          : role.minExperienceYears;
      const careerSwitcherPct =
        totalPeers > 0
          ? parseFloat(
              (
                (relevantPeers.filter((p) => p.isCareerSwitcher).length / totalPeers) *
                100
              ).toFixed(1),
            )
          : 0;

      const skillFreq = new Map<string, number>();
      if (totalPeers > 0) {
        for (const peer of relevantPeers) {
          for (const skill of peer.skills ?? []) {
            skillFreq.set(skill, (skillFreq.get(skill) ?? 0) + 1);
          }
        }
      } else {
        for (const skill of role.requiredSkills) {
          skillFreq.set(skill, 1);
        }
      }
      const mostCommonSkills = Array.from(skillFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s]) => s);

      const eduFreq = new Map<string, number>();
      for (const peer of relevantPeers) {
        if (peer.education) {
          eduFreq.set(peer.education, (eduFreq.get(peer.education) ?? 0) + 1);
        }
      }
      const mostCommonEducation =
        eduFreq.size > 0
          ? Array.from(eduFreq.entries()).sort((a, b) => b[1] - a[1])[0][0]
          : "Bachelor's in Computer Science or related";

      return {
        role_title: role.title,
        avg_skills_count: avgSkillsCount,
        avg_experience_years: avgExperienceYears,
        most_common_skills: mostCommonSkills,
        most_common_education: mostCommonEducation,
        career_switcher_pct: careerSwitcherPct,
        total_peers: totalPeers,
      };
    });

    return {
      your_skills_count: profile.skills?.length ?? 0,
      your_experience: profile.yearsExperience ?? 0,
      peer_insights: peerInsights,
    };
  }

  async getProjectSuggestions(profileId: number, tenantId: number): Promise<any> {
    const profile = await this.profileRepository.findOne({
      id: profileId,
      tenant: tenantId,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const skills: string[] = profile.skills ?? [];
    const has = (pattern: RegExp) => skills.some((s) => pattern.test(s));

    const hasPython = has(/python/i);
    const hasSql = has(/sql/i);
    const hasReact = has(/react/i);
    const hasCloud = has(/aws|azure|gcp|cloud/i);
    const hasTypeScript = has(/typescript/i);
    const hasDocker = has(/docker|kubernetes|k8s/i);
    const hasMl = has(/machine learning|scikit|tensorflow|pytorch|mlops/i);
    const hasDataEng = has(/spark|airflow|kafka|dbt|snowflake/i);
    const hasCyber = has(/security|siem|penetration|vulnerability/i);
    const hasJava = has(/java|spring/i);
    const hasManagement = has(/agile|scrum|stakeholder|leadership|product/i);
    const hasNlp = has(/nlp|natural language|bert|gpt/i);

    const suggestions: any[] = [];

    if (hasPython) {
      suggestions.push({
        title: 'Automated Job Market Dashboard',
        skill: 'Python',
        difficulty: 'intermediate',
        estimated_hours: 20,
        description:
          'Scrape Singapore job postings, clean the data with pandas, and visualise demand trends in a Streamlit dashboard.',
        technologies: ['Python', 'pandas', 'BeautifulSoup', 'Streamlit'],
        learning_outcomes: [
          'Web scraping and data wrangling',
          'Data visualisation with Streamlit',
          'Scheduling with cron or Prefect',
        ],
      });
    }

    if (hasSql) {
      suggestions.push({
        title: 'SkillsFuture Course Analytics',
        skill: 'SQL',
        difficulty: 'beginner',
        estimated_hours: 12,
        description:
          'Load the publicly available SkillsFuture course dataset into PostgreSQL and answer business questions with SQL queries.',
        technologies: ['PostgreSQL', 'SQL', 'DBeaver'],
        learning_outcomes: [
          'Complex JOIN and window functions',
          'Index optimisation',
          'Exploratory data analysis with SQL',
        ],
      });
    }

    if (hasReact) {
      suggestions.push({
        title: 'Personal Career Portfolio Site',
        skill: 'React',
        difficulty: 'intermediate',
        estimated_hours: 16,
        description:
          'Build a responsive portfolio showcasing your projects, skills, and SCTP certifications using Next.js and Tailwind CSS.',
        technologies: ['Next.js', 'React', 'Tailwind CSS', 'Vercel'],
        learning_outcomes: [
          'Next.js App Router and SSG',
          'Responsive design patterns',
          'CI/CD with Vercel deployments',
        ],
      });
    }

    if (hasCloud) {
      suggestions.push({
        title: 'Serverless Resume Parser API',
        skill: 'AWS',
        difficulty: 'advanced',
        estimated_hours: 25,
        description:
          'Deploy a Lambda function that accepts PDF uploads via S3, extracts text with Textract, and returns structured skills JSON.',
        technologies: ['AWS Lambda', 'S3', 'Textract', 'API Gateway', 'Python'],
        learning_outcomes: [
          'Serverless architecture patterns',
          'AWS IAM least-privilege design',
          'Event-driven S3 triggers',
        ],
      });
    }

    if (hasTypeScript) {
      suggestions.push({
        title: 'Type-Safe REST API with NestJS',
        skill: 'TypeScript',
        difficulty: 'intermediate',
        estimated_hours: 18,
        description:
          'Build a fully typed REST API with NestJS, PostgreSQL, and Swagger documentation — deploy to Railway or Fly.io.',
        technologies: ['TypeScript', 'NestJS', 'PostgreSQL', 'Swagger', 'Docker'],
        learning_outcomes: [
          'DTO validation and OpenAPI generation',
          'JWT authentication patterns',
          'Containerised deployment',
        ],
      });
    }

    if (hasDocker) {
      suggestions.push({
        title: 'Kubernetes Deployment Playground',
        skill: 'Docker/Kubernetes',
        difficulty: 'advanced',
        estimated_hours: 22,
        description:
          'Containerise a multi-service app and deploy it to a local Minikube cluster with resource limits, health probes, and rollouts.',
        technologies: ['Docker', 'Kubernetes', 'Helm', 'Prometheus', 'Grafana'],
        learning_outcomes: [
          'Container orchestration fundamentals',
          'Health checks and rolling updates',
          'Basic observability setup',
        ],
      });
    }

    if (hasDataEng) {
      suggestions.push({
        title: 'Real-time Data Pipeline with Kafka and Spark',
        skill: 'Data Engineering',
        difficulty: 'advanced',
        estimated_hours: 30,
        description:
          'Ingest a live data stream from Kafka, process it with Spark Structured Streaming, and write results to a PostgreSQL warehouse.',
        technologies: ['Apache Kafka', 'Spark', 'Python', 'PostgreSQL', 'Docker Compose'],
        learning_outcomes: [
          'Streaming vs batch processing trade-offs',
          'Exactly-once semantics',
          'Data quality checks at ingestion',
        ],
      });
    }

    if (hasCyber) {
      suggestions.push({
        title: 'Home Lab SIEM Setup',
        skill: 'Cybersecurity',
        difficulty: 'intermediate',
        estimated_hours: 20,
        description:
          'Set up an ELK-based SIEM on a local VM, ingest system and firewall logs, and build detection rules for common attack patterns.',
        technologies: ['Elasticsearch', 'Kibana', 'Logstash', 'Metasploit', 'Linux'],
        learning_outcomes: [
          'Log normalisation and correlation rules',
          'Attack pattern recognition',
          'Incident response playbooks',
        ],
      });
    }

    if (hasJava) {
      suggestions.push({
        title: 'Microservices with Spring Boot',
        skill: 'Java/Spring',
        difficulty: 'intermediate',
        estimated_hours: 24,
        description:
          'Build two communicating microservices using Spring Boot, with service discovery via Eureka and an API gateway.',
        technologies: ['Java', 'Spring Boot', 'Eureka', 'Docker', 'PostgreSQL'],
        learning_outcomes: [
          'Microservices communication patterns',
          'Service discovery and load balancing',
          'Distributed tracing basics',
        ],
      });
    }

    if (hasManagement) {
      suggestions.push({
        title: 'Agile Project Dashboard',
        skill: 'Project Management',
        difficulty: 'beginner',
        estimated_hours: 10,
        description:
          'Build a Kanban-style project tracker with React and Supabase, track sprint velocity, and generate burndown charts.',
        technologies: ['React', 'Supabase', 'Recharts', 'TypeScript'],
        learning_outcomes: [
          'Agile metrics and reporting',
          'Real-time database subscriptions',
          'Data visualisation for stakeholders',
        ],
      });
    }

    if (hasNlp) {
      suggestions.push({
        title: 'Singapore News Sentiment Analyser',
        skill: 'NLP',
        difficulty: 'intermediate',
        estimated_hours: 18,
        description:
          'Fine-tune a small BERT model on Singapore finance news headlines to classify sentiment, and expose it via a FastAPI endpoint.',
        technologies: ['Python', 'HuggingFace Transformers', 'FastAPI', 'Docker'],
        learning_outcomes: [
          'Transfer learning and fine-tuning',
          'Model serving with FastAPI',
          'Evaluation metrics (F1, AUC)',
        ],
      });
    }

    if (hasPython || hasMl) {
      suggestions.push({
        title: 'End-to-End ML Pipeline',
        skill: 'Machine Learning',
        difficulty: 'advanced',
        estimated_hours: 30,
        description:
          'Train a salary prediction model on Singapore job data, track experiments with MLflow, and serve predictions via a FastAPI endpoint.',
        technologies: ['Python', 'scikit-learn', 'MLflow', 'FastAPI', 'Docker'],
        learning_outcomes: [
          'Feature engineering and cross-validation',
          'Experiment tracking with MLflow',
          'Model serving and containerisation',
        ],
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        title: 'Personal Tech Blog',
        skill: 'General',
        difficulty: 'beginner',
        estimated_hours: 8,
        description:
          'Set up a personal blog with Next.js and MDX to document your learning journey and SCTP course notes.',
        technologies: ['Next.js', 'MDX', 'Tailwind CSS', 'Vercel'],
        learning_outcomes: ['Static site generation', 'Markdown authoring', 'Basic deployment pipeline'],
      });
    }

    return { suggestions };
  }

  async getMarketInsights(_tenantId: number): Promise<any> {
    return {
      top_skills_overall: ['Python', 'SQL', 'GenAI', 'TypeScript', 'AWS', 'Docker', 'Kubernetes'],
      highest_demand_sectors: ['FinTech', 'HealthTech', 'E-commerce', 'Cybersecurity', 'Cloud Computing'],
      last_updated: new Date().toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      insights: [
        {
          role_category: 'FinTech',
          demand_level: 'high',
          avg_salary_sgd: 8500,
          yoy_growth_pct: 12,
          hiring_volume: 450,
          trending_skills: ['React', 'NestJS', 'TypeScript'],
          forecast_2026: 'Bullish',
          outlook: 'Continued demand for full-stack engineers with focus on security and scalability.',
        },
        {
          role_category: 'HealthTech',
          demand_level: 'high',
          avg_salary_sgd: 9500,
          yoy_growth_pct: 18,
          hiring_volume: 320,
          trending_skills: ['Python', 'PyTorch', 'SQL'],
          forecast_2026: 'Strong',
          outlook: 'Surge in AI-driven diagnostics and personalized medicine requirements.',
        },
        {
          role_category: 'E-commerce',
          demand_level: 'medium',
          avg_salary_sgd: 7200,
          yoy_growth_pct: 8,
          hiring_volume: 380,
          trending_skills: ['Python', 'SQL', 'Machine Learning'],
          forecast_2026: 'Stable',
          outlook: 'Steady growth driven by personalisation and recommendation engine investments.',
        },
        {
          role_category: 'Cybersecurity',
          demand_level: 'high',
          avg_salary_sgd: 10500,
          yoy_growth_pct: 22,
          hiring_volume: 280,
          trending_skills: ['SIEM', 'Network Security', 'Python'],
          forecast_2026: 'Strong',
          outlook: 'Critical talent shortage; MAS regulations driving compliance hiring across all sectors.',
        },
        {
          role_category: 'Cloud Computing',
          demand_level: 'high',
          avg_salary_sgd: 9800,
          yoy_growth_pct: 20,
          hiring_volume: 410,
          trending_skills: ['AWS', 'Kubernetes', 'Terraform'],
          forecast_2026: 'Bullish',
          outlook: 'Digital transformation mandates across government and enterprise driving cloud adoption.',
        },
        {
          role_category: 'Data & Analytics',
          demand_level: 'high',
          avg_salary_sgd: 8200,
          yoy_growth_pct: 15,
          hiring_volume: 520,
          trending_skills: ['Python', 'SQL', 'Spark'],
          forecast_2026: 'Bullish',
          outlook: 'Data-driven decision making becoming standard; GenAI integration accelerating demand.',
        },
        {
          role_category: 'Software Engineering',
          demand_level: 'high',
          avg_salary_sgd: 7800,
          yoy_growth_pct: 10,
          hiring_volume: 680,
          trending_skills: ['TypeScript', 'React', 'Node.js'],
          forecast_2026: 'Stable',
          outlook: 'Consistent baseline demand; AI tooling raising productivity expectations.',
        },
      ],
    };
  }

  async analyzeJdMatch(
    profileId: number,
    jobDescription: string,
    jobTitle: string | undefined,
    tenantId: number,
  ): Promise<any> {
    const profile = await this.profileRepository.findOne({ id: profileId, tenant: tenantId });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const profileSkills = profile.skills ?? [];
    let extractedSkills: string[];
    let matchScore: number;
    let gapSkills: string[];

    try {
      const result = await this.llmService.analyzeJobDescription(jobDescription, profileSkills);
      extractedSkills = result.extracted_skills;
      matchScore = result.match_score;
      gapSkills = result.gaps;
    } catch {
      extractedSkills = ResumeParser.extractSkills(jobDescription);
      const profileSet = new Set(profileSkills.map((s) => s.toLowerCase()));
      const matched = extractedSkills.filter((s) => profileSet.has(s.toLowerCase()));
      matchScore = extractedSkills.length > 0 ? matched.length / extractedSkills.length : 0;
      gapSkills = extractedSkills.filter((s) => !profileSet.has(s.toLowerCase()));
    }

    const gaps = gapSkills.map((skill, idx) => ({
      skill,
      user_level: 0,
      gap_severity: idx < 3 ? 'high' : 'medium',
      required_level: 'required',
      user_level_label: 'Missing',
      priority: idx < 3 ? 'high' : 'medium',
    }));

    return {
      job_title: jobTitle ?? 'Analysed Role',
      match_score: parseFloat(matchScore.toFixed(3)),
      extracted_skills: extractedSkills,
      gaps,
    };
  }

  async rewriteBullet(targetRole: string, bulletPoint: string): Promise<any> {
    try {
      const result = await this.llmService.rewriteBullet(targetRole, bulletPoint);
      return {
        original: bulletPoint,
        ...result,
      };
    } catch {
      const rewritten = `Demonstrated ${bulletPoint.replace(/^[A-Z]/, (c) => c.toLowerCase())} — contributing directly to ${targetRole} objectives and driving measurable team impact.`;
      return {
        original: bulletPoint,
        rewritten,
        improvement_notes: `Rewritten with action-outcome framing relevant to ${targetRole}. For AI-powered rewrites, configure GEMINI_API_KEY.`,
      };
    }
  }
}
