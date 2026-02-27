import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LlmService {
  private geminiClient: any = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        // Lazy-load to avoid crashing when package not installed
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        this.geminiClient = genAI.getGenerativeModel({
          model: this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash',
        });
      } catch {
        // @google/generative-ai not installed — LLM calls will throw
        this.geminiClient = null;
      }
    }
  }

  private ensureConfigured(): void {
    if (!this.geminiClient) {
      throw new ServiceUnavailableException(
        'LLM not configured. Set GEMINI_API_KEY environment variable.',
      );
    }
  }

  async chat(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
    this.ensureConfigured();

    // Build Gemini chat history (all messages before the last user message)
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];
    const chat = this.geminiClient.startChat({
      history,
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    });

    const result = await chat.sendMessage(lastMessage?.content ?? '');
    return result.response.text();
  }

  async generateInterviewQuestion(
    roleTitle: string,
    difficulty: string,
    previousMessages: any[],
    targetSkill: string,
    isComplete: boolean,
  ): Promise<{ reply: string; feedback?: string }> {
    this.ensureConfigured();

    if (isComplete) {
      const transcript = previousMessages
        .map((m) => `${m.role === 'assistant' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
        .join('\n');

      const summaryPrompt =
        `You are conducting a mock interview for a ${roleTitle} role (difficulty: ${difficulty}). ` +
        `Based on the interview transcript below, provide concise constructive feedback (3-4 sentences) ` +
        `highlighting strengths and areas to improve.\n\nTranscript:\n${transcript}`;

      const result = await this.geminiClient.generateContent(summaryPrompt);
      const feedback = result.response.text();
      return {
        reply: 'Great effort throughout the interview! Here is your personalised feedback.',
        feedback,
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
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    });

    const result = await chat.sendMessage(
      `Ask a ${difficulty} interview question about ${targetSkill} for ${roleTitle}.`,
    );
    return { reply: result.response.text() };
  }

  async rewriteBullet(
    targetRole: string,
    bulletPoint: string,
  ): Promise<{ rewritten: string; improvement_notes: string }> {
    this.ensureConfigured();

    const prompt =
      `You are a professional resume writer. Rewrite the following resume bullet point to be more ` +
      `impactful and relevant for a ${targetRole} role. Use strong action verbs and quantify where possible.\n\n` +
      `Original: "${bulletPoint}"\n\n` +
      `Respond in JSON format: { "rewritten": "...", "improvement_notes": "1-2 sentences explaining improvements" }`;

    const result = await this.geminiClient.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
    const parsed = JSON.parse(jsonMatch[1].trim());
    return parsed;
  }

  async analyzeJobDescription(
    jdText: string,
    profileSkills: string[],
  ): Promise<{ extracted_skills: string[]; match_score: number; gaps: string[] }> {
    this.ensureConfigured();

    const prompt =
      `You are a career analyst. Analyse this job description and extract the required technical and soft skills.\n\n` +
      `Job Description:\n${jdText.substring(0, 3000)}\n\n` +
      `Candidate's current skills: ${profileSkills.join(', ')}\n\n` +
      `Respond in JSON format:\n` +
      `{ "extracted_skills": ["skill1", "skill2", ...], "match_score": 0.0-1.0, "gaps": ["missing_skill1", ...] }\n` +
      `match_score is the fraction of extracted_skills present in candidate's skills.`;

    const result = await this.geminiClient.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text];
    return JSON.parse(jsonMatch[1].trim());
  }
}
