import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';
import { MikroORM } from '@mikro-orm/core';
import { DatabaseSeeder } from './seeders/DatabaseSeeder';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Create/update DB schema from entities, then seed reference data.
  // updateSchema() is additive-only (never drops tables/columns) so it is
  // safe to run on every cold start. The seeder guards every insert with
  // findOne(), making it idempotent as well.
  const orm = app.get(MikroORM);
  try {
    await orm.getSchemaGenerator().updateSchema();
    logger.log('Schema up to date');
    const seeder = orm.getSeeder();
    await seeder.seed(DatabaseSeeder);
    logger.log('Seed complete');
  } catch (err) {
    logger.error('Schema/seed failed — continuing anyway', err);
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
