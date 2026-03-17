import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { SystemDocument } from '../entities/system-document.entity';
import { EmbeddingService } from '../rag/embedding.service';
import { LlmService, providerLabel } from './llm.service';

export interface IngestChunkDto {
  filePath: string;
  content: string;
  chunkHash: string;
}

export interface SystemChatDto {
  query: string;
}

@Injectable()
export class SystemTerminalService {
  private readonly logger = new Logger(SystemTerminalService.name);

  // The strict system prompt required by the user
  private readonly SYSTEM_PROMPT = `You are the SkillBridge System AI.

You answer questions about the SkillBridge SaaS platform only.

Allowed Topics:
- Architecture
- AI RAG pipeline
- Datasets and data ingestion
- Features
- AWS and infrastructure
- System design
- Deployment
- Observability / activity logging

Forbidden Topics:
- User accounts
- Registered users
- Personal data
- Conversations
- External topics unrelated to SkillBridge

If a question is outside scope, respond exactly:
"This terminal only answers questions about the SkillBridge platform."

Answer the user's question using ONLY the provided context sources below.`;

  constructor(
    @InjectRepository(SystemDocument)
    private readonly sysDocRepo: EntityRepository<SystemDocument>,
    private readonly em: EntityManager,
    private readonly embeddingService: EmbeddingService,
    private readonly llmService: LlmService,
  ) {}

  /**
   * Called internally to build the pgvector system documentation base.
   */
  async ingestChunks(
    chunks: IngestChunkDto[],
  ): Promise<{ ingested: number; errors: number }> {
    let ingested = 0;
    let errors = 0;

    for (const chunk of chunks) {
      try {
        const existing = await this.sysDocRepo.findOne({
          chunkHash: chunk.chunkHash,
        });
        if (existing) continue;

        const embedding = await this.embeddingService.embed(chunk.content);
        const doc = this.sysDocRepo.create({
          filePath: chunk.filePath,
          content: chunk.content,
          chunkHash: chunk.chunkHash,
          embedding,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        this.em.persist(doc);
        ingested++;
      } catch (err) {
        this.logger.error(`Failed to ingest chunk for ${chunk.filePath}`, err);
        errors++;
      }
    }

    if (ingested > 0) {
      await this.em.flush();
      this.logger.log(
        `Flushed ${ingested} new system documents to the database.`,
      );
    }

    return { ingested, errors };
  }

  /**
   * Executes a semantic search over system documents and responds within scope.
   */
  async systemChat(dto: SystemChatDto): Promise<any> {
    const start = Date.now();

    // 1. Generate query embedding
    const queryVector = await this.embeddingService.embed(dto.query);
    const embedTimeMs = Date.now() - start;

    // 2. Perform vector cosine similarity search
    const searchStart = Date.now();
    const conn = this.em.getConnection();
    const queryStr = `
      SELECT file_path, content, 1 - (embedding <=> ?::vector) as similarity
      FROM system_documents
      ORDER BY embedding <=> ?::vector
      LIMIT 5
    `;
    let results: any[] = [];
    try {
      results = await conn.execute(queryStr, [
        JSON.stringify(queryVector),
        JSON.stringify(queryVector),
      ]);
    } catch (err) {
      this.logger.warn(
        'system_documents query failed — table may not be seeded yet',
        (err as Error).message,
      );
    }
    const searchTimeMs = Date.now() - searchStart;

    // 3. Construct context
    let contextStr = '--- CONTEXT SOURCES ---\n';
    const sources: string[] = [];
    for (const row of results) {
      // Threshold guard to prevent hallucinations on bad matches
      if (row.similarity > 0.3) {
        contextStr += `[Source: ${row.file_path}]\n${row.content}\n\n`;
        // ensure unique sources list
        if (!sources.includes(row.file_path)) {
          sources.push(row.file_path);
        }
      }
    }

    // 4. Ask LlmService
    const fullSystemPrompt = `${this.SYSTEM_PROMPT}\n\n${contextStr}`;
    const llmStart = Date.now();
    const reply = await this.llmService.chat(
      [{ role: 'user', content: dto.query }],
      fullSystemPrompt,
    );
    const llmTimeMs = Date.now() - llmStart;

    return {
      reply,
      engine: providerLabel(this.llmService.getLastUsedProvider()),
      sources,
      pipeline: {
        embedTimeMs,
        searchTimeMs,
        llmTimeMs,
        totalTimeMs: Date.now() - start,
      },
    };
  }
}
