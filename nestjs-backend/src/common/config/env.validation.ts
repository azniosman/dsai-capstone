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

  // Google Gemini — optional; if absent, LLM-powered endpoints return 503
  @IsString()
  @IsOptional()
  readonly GEMINI_API_KEY?: string;

  @IsString()
  @IsOptional()
  readonly GEMINI_MODEL?: string;

  // AWS Bedrock — optional fallback LLM provider
  @IsString()
  @IsOptional()
  readonly AWS_REGION?: string;

  @IsString()
  @IsOptional()
  readonly BEDROCK_MODEL_ID?: string;
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
