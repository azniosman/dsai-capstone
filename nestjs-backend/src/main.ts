import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@app/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '@app/common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
