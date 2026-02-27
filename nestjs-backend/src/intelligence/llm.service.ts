import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

type ChatMessage = { role: string; content: string };

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private geminiClient: any = null;
  private bedrockClient: BedrockRuntimeClient | null = null;
  private readonly bedrockModelId: string;

  constructor(private readonly configService: ConfigService) {
    // --- Gemini init ---
    const geminiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (geminiKey) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiKey);
        this.geminiClient = genAI.getGenerativeModel({
          model:
            this.configService.get<string>('GEMINI_MODEL') ??
            'gemini-2.0-flash',
        });
        this.logger.log('Gemini client initialised');
      } catch {
        this.logger.warn(
          'Failed to initialise Gemini client — @google/generative-ai may not be installed',
        );
      }
    }

    // --- Bedrock init ---
    const region =
      this.configService.get<string>('AWS_REGION') ?? 'ap-southeast-1';
    this.bedrockModelId =
      this.configService.get<string>('BEDROCK_MODEL_ID') ??
      'anthropic.claude-3-5-sonnet-20240620-v1:0';

    try {
      this.bedrockClient = new BedrockRuntimeClient({ region });
      this.logger.log(
        `Bedrock client initialised (region=${region}, model=${this.bedrockModelId})`,
      );
    } catch (err) {
      this.logger.warn('Failed to initialise Bedrock client', err);
      this.bedrockClient = null;
    }
  }

  // ─── Helpers ────────────────────────────────────────────────

  private get hasGemini(): boolean {
    return this.geminiClient !== null;
  }

  private get hasBedrock(): boolean {
    return this.bedrockClient !== null;
  }

  /**
   * Invoke Bedrock Claude with the Anthropic Messages API format.
   */
  private async invokeBedrockClaude(
    messages: { role: string; content: string }[],
    systemPrompt: string,
  ): Promise<string> {
    if (!this.bedrockClient) {
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
      modelId: this.bedrockModelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: new TextEncoder().encode(body),
    });

    const response = await this.bedrockClient.send(command);
    const decoded = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(decoded);

    // Anthropic Claude returns { content: [{ type: 'text', text: '...' }] }
    return parsed.content?.[0]?.text ?? '';
  }

  /**
   * Invoke Bedrock Claude with a single prompt string (no multi-turn).
   */
  private async invokeBedrockSinglePrompt(prompt: string): Promise<string> {
    return this.invokeBedrockClaude(
      [{ role: 'user', content: prompt }],
      'You are a helpful assistant. Respond concisely.',
    );
  }

  /**
   * Fallback-aware wrapper: try Gemini first, then Bedrock, then throw 503.
   */
  private async withFallback<T>(
    label: string,
    geminiCall: () => Promise<T>,
    bedrockCall: () => Promise<T>,
  ): Promise<T> {
    // Try Gemini
    if (this.hasGemini) {
      try {
        const result = await geminiCall();
        this.logger.debug(`[${label}] served by Gemini`);
        return result;
      } catch (err) {
        this.logger.warn(
          `[${label}] Gemini failed, falling back to Bedrock`,
          (err as Error).message,
        );
      }
    }

    // Try Bedrock
    if (this.hasBedrock) {
      try {
        const result = await bedrockCall();
        this.logger.debug(`[${label}] served by Bedrock`);
        return result;
      } catch (err) {
        this.logger.error(
          `[${label}] Bedrock also failed`,
          (err as Error).message,
        );
      }
    }

    throw new ServiceUnavailableException(
      `LLM unavailable for ${label}. Configure GEMINI_API_KEY or AWS Bedrock credentials.`,
    );
  }

  // ─── Public API ─────────────────────────────────────────────

  async chat(messages: ChatMessage[], systemPrompt: string): Promise<string> {
    return this.withFallback(
      'chat',
      // Gemini
      async () => {
        const history = messages.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const lastMessage = messages[messages.length - 1];
        const chat = this.geminiClient.startChat({
          history,
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemPrompt }],
          },
        });
        const result = await chat.sendMessage(lastMessage?.content ?? '');
        return result.response.text();
      },
      // Bedrock
      async () => this.invokeBedrockClaude(messages, systemPrompt),
    );
  }

  async generateInterviewQuestion(
    roleTitle: string,
    difficulty: string,
    previousMessages: ChatMessage[],
    targetSkill: string,
    isComplete: boolean,
  ): Promise<{ reply: string; feedback?: string }> {
    return this.withFallback(
      'interview',
      // Gemini
      async () => {
        if (isComplete) {
          const transcript = previousMessages
            .map(
              (m) =>
                `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`,
            )
            .join('\n');
          const summaryPrompt =
            `You are conducting a mock interview for a ${roleTitle} role (difficulty: ${difficulty}). ` +
            `Based on the interview transcript below, provide concise constructive feedback (3-4 sentences) ` +
            `highlighting strengths and areas to improve.\n\nTranscript:\n${transcript}`;
          const result = await this.geminiClient.generateContent(summaryPrompt);
          return {
            reply:
              'Great effort throughout the interview! Here is your personalised feedback.',
            feedback: result.response.text(),
          };
        }

        const history = previousMessages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const systemPrompt =
          `You are a technical interviewer for a ${roleTitle} position (difficulty: ${difficulty}). ` +
          `Ask ONE concise, specific interview question targeting the skill: "${targetSkill}". ` +
          `Do not reveal which skill you are testing. Only output the question, nothing else.`;
        const chat = this.geminiClient.startChat({
          history,
          systemInstruction: {
            role: 'system',
            parts: [{ text: systemPrompt }],
          },
        });
        const result = await chat.sendMessage(
          `Ask a ${difficulty} interview question about ${targetSkill} for ${roleTitle}.`,
        );
        return { reply: result.response.text() };
      },
      // Bedrock
      async () => {
        if (isComplete) {
          const transcript = previousMessages
            .map(
              (m) =>
                `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`,
            )
            .join('\n');
          const prompt =
            `You are conducting a mock interview for a ${roleTitle} role (difficulty: ${difficulty}). ` +
            `Based on the interview transcript below, provide concise constructive feedback (3-4 sentences) ` +
            `highlighting strengths and areas to improve.\n\nTranscript:\n${transcript}`;
          const feedback = await this.invokeBedrockSinglePrompt(prompt);
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
        const reply = await this.invokeBedrockClaude(
          [
            ...previousMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            {
              role: 'user',
              content: `Ask a ${difficulty} interview question about ${targetSkill} for ${roleTitle}.`,
            },
          ],
          systemPrompt,
        );
        return { reply };
      },
    );
  }

  async rewriteBullet(
    targetRole: string,
    bulletPoint: string,
  ): Promise<{ rewritten: string; improvement_notes: string }> {
    const prompt =
      `You are a professional resume writer. Rewrite the following resume bullet point to be more ` +
      `impactful and relevant for a ${targetRole} role. Use strong action verbs and quantify where possible.\n\n` +
      `Original: "${bulletPoint}"\n\n` +
      `Respond in JSON format: { "rewritten": "...", "improvement_notes": "1-2 sentences explaining improvements" }`;

    return this.withFallback(
      'rewriteBullet',
      // Gemini
      async () => {
        const result = await this.geminiClient.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          text,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
      // Bedrock
      async () => {
        const text = await this.invokeBedrockSinglePrompt(prompt);
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          text,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
    );
  }

  async analyzeJobDescription(
    jdText: string,
    profileSkills: string[],
  ): Promise<{
    extracted_skills: string[];
    match_score: number;
    gaps: string[];
  }> {
    const prompt =
      `You are a career analyst. Analyse this job description and extract the required technical and soft skills.\n\n` +
      `Job Description:\n${jdText.substring(0, 3000)}\n\n` +
      `Candidate's current skills: ${profileSkills.join(', ')}\n\n` +
      `Respond in JSON format:\n` +
      `{ "extracted_skills": ["skill1", "skill2", ...], "match_score": 0.0-1.0, "gaps": ["missing_skill1", ...] }\n` +
      `match_score is the fraction of extracted_skills present in candidate's skills.`;

    return this.withFallback(
      'analyzeJD',
      // Gemini
      async () => {
        const result = await this.geminiClient.generateContent(prompt);
        const text = result.response.text().trim();
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          text,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
      // Bedrock
      async () => {
        const text = await this.invokeBedrockSinglePrompt(prompt);
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          text,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
    );
  }

  // ─── Phase 2: LLM-enhanced resume parsing ───────────────────

  async parseResume(text: string): Promise<{
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience_years: number;
  }> {
    const prompt =
      `You are an expert resume parser. Extract structured data from the following resume text.\n\n` +
      `Resume:\n${text.substring(0, 4000)}\n\n` +
      `Respond in JSON format:\n` +
      `{ "name": "Full Name", "email": "email@example.com", "phone": "+65...", ` +
      `"skills": ["skill1", "skill2", ...], "experience_years": <number> }\n` +
      `If a field is not found, use empty string for strings, empty array for skills, and 0 for experience_years.`;

    return this.withFallback(
      'parseResume',
      // Gemini
      async () => {
        const result = await this.geminiClient.generateContent(prompt);
        const raw = result.response.text().trim();
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          raw,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
      // Bedrock
      async () => {
        const raw = await this.invokeBedrockSinglePrompt(prompt);
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          raw,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
    );
  }

  // ─── Phase 3: LLM-enhanced enrichment helpers ───────────────

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

    const prompt =
      `You are a Singapore career advisor for SCTP learners. Given the profile summary and role matches below, ` +
      `write ONE short personalised rationale sentence for each role explaining why it is a good fit and what to focus on.\n\n` +
      `Profile: ${profileSummary}\n\nRoles:\n${rolesBlock}\n\n` +
      `Respond as a JSON array of strings — one rationale per role in the same order. No markdown, only JSON.`;

    return this.withFallback(
      'generateRationale',
      async () => {
        const result = await this.geminiClient.generateContent(prompt);
        const raw = result.response.text().trim();
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          raw,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
      async () => {
        const raw = await this.invokeBedrockSinglePrompt(prompt);
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          raw,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
    );
  }

  async generateSkillGapAdvice(
    roleTitle: string,
    gaps: { skill: string; gap_severity: string }[],
  ): Promise<string[]> {
    const gapsList = gaps
      .map((g) => `${g.skill} (${g.gap_severity} priority)`)
      .join(', ');
    const prompt =
      `You are a Singapore career advisor. For a candidate targeting a ${roleTitle} role, ` +
      `provide ONE practical learning tip (1 sentence) for each skill gap below.\n\n` +
      `Gaps: ${gapsList}\n\n` +
      `Respond as a JSON array of strings — one tip per gap in the same order. No markdown, only JSON.`;

    return this.withFallback(
      'skillGapAdvice',
      async () => {
        const result = await this.geminiClient.generateContent(prompt);
        const raw = result.response.text().trim();
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          raw,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
      async () => {
        const raw = await this.invokeBedrockSinglePrompt(prompt);
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [
          null,
          raw,
        ];
        return JSON.parse(jsonMatch[1].trim());
      },
    );
  }

  async generateRoadmapNarrative(
    profileSkills: string[],
    targetRole: string,
    gapCount: number,
    courseTitles: string[],
  ): Promise<string> {
    const prompt =
      `You are a Singapore career advisor for SCTP learners. Write a brief motivating paragraph (3-4 sentences) ` +
      `about why this upskilling roadmap will help bridge ${gapCount} skill gaps for the ${targetRole} role.\n\n` +
      `Current skills: ${profileSkills.join(', ')}\n` +
      `Recommended courses: ${courseTitles.join(', ')}\n\n` +
      `Be encouraging and mention SkillsFuture support where relevant. Output only the paragraph, no markdown.`;

    return this.withFallback(
      'roadmapNarrative',
      async () => {
        const result = await this.geminiClient.generateContent(prompt);
        return result.response.text().trim();
      },
      async () => this.invokeBedrockSinglePrompt(prompt),
    );
  }
}
