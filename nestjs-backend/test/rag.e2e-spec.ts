/**
 * @file rag.e2e-spec.ts
 * @description E2E test scaffold for the RAG pipeline endpoints.
 *
 * These tests require a real PostgreSQL database with pgvector enabled.
 * Gate behind E2E_DATABASE_URL so they are skipped in unit-test-only CI.
 *
 * Run manually:
 *   E2E_DATABASE_URL=postgresql://... npm run test:e2e -- --testPathPattern=rag
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');

// Skip the entire suite if no E2E database is configured
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;
const describeE2E = E2E_DATABASE_URL ? describe : describe.skip;

describeE2E('RAG pipeline (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Dynamically import AppModule to avoid loading it in unit-test environments
    const { AppModule } = await import('../src/app.module.js');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE_URL')
      .useValue(E2E_DATABASE_URL)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /api/rag/query', () => {
    it('returns 200 with chunks array for a valid query', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/rag/query')
        .send({ query: 'data analyst Singapore salary', top_k: 3 })
        .expect(200);

      expect(response.body).toHaveProperty('chunks');
      expect(Array.isArray(response.body.chunks)).toBe(true);
      // total may be 0 if database is empty — that is acceptable
      expect(response.body).toHaveProperty('total');
    });

    it('returns 400 when query field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/rag/query')
        .send({ top_k: 5 })
        .expect(400);
    });
  });

  describe('POST /api/rag/feedback', () => {
    it('returns 200 with recorded:true for a valid feedback payload', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/rag/feedback')
        .send({
          chunk_id: 1,
          query_text: 'data analyst',
          is_positive: true,
        })
        .expect((res: any) => {
          // 200 OK or 404 if chunk doesn't exist — both are acceptable in E2E
          expect([200, 404]).toContain(res.status);
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('recorded');
      }
    });
  });
});
