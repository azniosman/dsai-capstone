import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  readonly NODE_ENV?: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  readonly PORT?: number = 8000;

  @IsString()
  @IsOptional()
  readonly DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  readonly JWT_SECRET?: string;

  // SSG/WSG API — optional; if absent, service falls back to seeded data
  @IsString()
  @IsOptional()
  readonly SSG_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  readonly SSG_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  readonly SSG_API_BASE_URL?: string;

  @IsString()
  @IsOptional()
  readonly SSG_TOKEN_URL?: string;

  @IsString()
  @IsOptional()
  readonly SSG_CACHE_TTL_SECONDS?: string;

  // LLM Router — provider priority (groq | claude | gemini)
  @IsString()
  @IsOptional()
  readonly PRIMARY_LLM?: string;

  @IsString()
  @IsOptional()
  readonly SECONDARY_LLM?: string;

  @IsString()
  @IsOptional()
  readonly TERTIARY_LLM?: string;

  // Groq (primary)
  @IsString()
  @IsOptional()
  readonly GROQ_API_KEY?: string;

  @IsString()
  @IsOptional()
  readonly GROQ_MODEL?: string;

  @IsString()
  @IsOptional()
  readonly AI_TEMPERATURE?: string;

  @IsString()
  @IsOptional()
  readonly AI_MAX_TOKENS?: string;

  // Anthropic Claude direct API
  @IsString()
  @IsOptional()
  readonly ANTHROPIC_API_KEY?: string;

  @IsString()
  @IsOptional()
  readonly CLAUDE_MODEL?: string;

  // Google Gemini
  @IsString()
  @IsOptional()
  readonly GEMINI_API_KEY?: string;

  @IsString()
  @IsOptional()
  readonly GEMINI_MODEL?: string;

  // Internal automation — shared secret for EventBridge Lambda-to-Lambda calls
  @IsString()
  @IsOptional()
  readonly INTERNAL_AUTOMATION_TOKEN?: string;

  // Embedding model — optional; both supported models output 384-dim vectors
  // Valid values: 'Xenova/all-MiniLM-L6-v2' (default) | 'Xenova/all-MiniLM-L12-v2'
  @IsString()
  @IsOptional()
  readonly EMBEDDING_MODEL?: string;

  // Cross-encoder re-ranker (Phase 6) — all optional, disabled by default
  // RERANKER_ENABLED: set to 'true' to activate (default: disabled)
  // RERANKER_MODEL: HuggingFace model ID (default: 'Xenova/ms-marco-MiniLM-L-6-v2')
  // RERANKER_TOP_N: how many RRF candidates to score (default: 20)
  @IsString()
  @IsOptional()
  readonly RERANKER_ENABLED?: string;

  @IsString()
  @IsOptional()
  readonly RERANKER_MODEL?: string;

  @IsString()
  @IsOptional()
  readonly RERANKER_TOP_N?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
