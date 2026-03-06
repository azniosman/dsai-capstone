import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { DatabaseSeeder } from './seeders/DatabaseSeeder';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Create/update DB schema from entities, then seed reference data.
  // updateSchema() is additive-only (never drops tables/columns) so it is
  // safe to run on every cold start. The seeder guards every insert with
  // findOne(), making it idempotent as well.
  const orm = app.get(MikroORM);
  const pgEm = orm.em as EntityManager;

  // Each step is independent — a failure in one should not prevent later steps.
  try {
    await pgEm.getConnection().execute('CREATE EXTENSION IF NOT EXISTS vector');
    logger.log('pgvector extension ready');
  } catch (err) {
    logger.warn(
      'pgvector extension setup failed (may already exist or lack privileges)',
      (err as Error).message,
    );
  }

  try {
    // Additive-only (never drops tables/columns) — safe on every cold start.
    await orm.getSchemaGenerator().updateSchema();
    logger.log('Schema up to date');
  } catch (err) {
    logger.error('updateSchema failed', (err as Error).message);
  }

  try {
    await pgEm.getConnection().execute(`
      CREATE INDEX IF NOT EXISTS document_chunk_embedding_hnsw
      ON document_chunk USING hnsw (embedding vector_cosine_ops)
    `);
    logger.log('HNSW index ready');
  } catch (err) {
    logger.warn('HNSW index skipped', (err as Error).message);
  }

  try {
    await pgEm.getConnection().execute(`
      ALTER TABLE document_chunk
      ADD COLUMN IF NOT EXISTS search_vector tsvector
      GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
    `);
    await pgEm.getConnection().execute(`
      CREATE INDEX IF NOT EXISTS document_chunk_search_vector_gin
      ON document_chunk USING gin(search_vector)
    `);
    logger.log('tsvector column + GIN index ready');
  } catch (err) {
    logger.warn('tsvector/GIN index skipped', (err as Error).message);
  }

  try {
    const seeder = orm.getSeeder();
    await seeder.seed(DatabaseSeeder);
    logger.log('Seed complete');
  } catch (err) {
    logger.error('Seed failed — continuing anyway', (err as Error).message);
  }

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  app.enableCors({
    origin: (() => {
      const raw = process.env.CORS_ALLOWED_ORIGINS;
      if (!raw) return ['http://localhost:3000', 'http://localhost:5173'];
      try {
        return JSON.parse(raw) as string[];
      } catch {
        return raw.split(',');
      }
    })(),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
