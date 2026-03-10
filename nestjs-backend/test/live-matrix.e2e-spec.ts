/**
 * @file live-matrix.e2e-spec.ts
 * @description E2E test scaffold for the Data Intelligence / Live Matrix endpoints.
 *
 * These tests require a real PostgreSQL database with pgvector enabled.
 * Gate behind E2E_DATABASE_URL so they are skipped in unit-test-only CI.
 *
 * Run manually:
 *   E2E_DATABASE_URL=postgresql://... npm run test:e2e -- --testPathPattern=live-matrix
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import request = require('supertest');
import { Dataset, DatasetStatus } from '../src/entities/dataset.entity';
import { LiveMatrixData } from '../src/entities/live-matrix-data.entity';
import { TrendSignal } from '../src/entities/trend-signal.entity';
import { DatasetDiff, ChangeType } from '../src/entities/dataset-diff.entity';

// Skip the entire suite if no E2E database is configured
const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL;
const describeE2E = E2E_DATABASE_URL ? describe : describe.skip;

describeE2E('Data Intelligence - Live Matrix (e2e)', () => {
  let app: INestApplication;
  let em: EntityManager;

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

    em = moduleFixture.get<EntityManager>(EntityManager);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await em.getRepository(LiveMatrixData).nativeDelete({});
    await em.getRepository(Dataset).nativeDelete({});
    await em.getRepository(TrendSignal).nativeDelete({});
    await em.getRepository(DatasetDiff).nativeDelete({});
  });

  describe('GET /api/live-matrix', () => {
    it('returns empty data when no dataset exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/live-matrix')
        .expect(200);

      expect(response.body).toMatchObject({
        data: [],
        total: 0,
        page: 1,
        limit: 50,
        dataset: null,
      });
    });

    it('returns data from the latest completed dataset', async () => {
      // Create a completed dataset
      const dataset = em.create(Dataset, {
        datasetName: 'Test Dataset',
        datasetVersion: 'v1.0.0',
        checksum: 'abc123',
        recordCount: 10,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      // Create matrix data
      const matrixData = em.create(LiveMatrixData, {
        dataset,
        year: 2025,
        sector: 'Technology',
        jobRole: 'Data Analyst',
        skillCategory: 'Analytics',
        demandIndex: 0.85,
        supplyIndex: 0.6,
        growthRate: 12.5,
      });
      await em.persistAndFlush(matrixData);

      const response = await request(app.getHttpServer())
        .get('/api/live-matrix')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        year: 2025,
        sector: 'Technology',
        jobRole: 'Data Analyst',
        demandIndex: 0.85,
      });
      expect(response.body.dataset).toHaveProperty('id', dataset.id);
    });

    it('supports pagination with page and limit params', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Pagination Test',
        datasetVersion: 'v1.0.0',
        checksum: 'def456',
        recordCount: 25,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      // Create 25 records
      for (let i = 1; i <= 25; i++) {
        em.create(LiveMatrixData, {
          dataset,
          year: 2025,
          sector: 'Technology',
          jobRole: `Role ${i}`,
          skillCategory: 'Analytics',
          demandIndex: 0.5 + i * 0.02,
          supplyIndex: 0.4 + i * 0.02,
          growthRate: i * 1.5,
        });
      }
      await em.flush();

      const response = await request(app.getHttpServer())
        .get('/api/live-matrix?page=2&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(10);
      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
      expect(response.body.total).toBe(25);
    });

    it('limits max limit to 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/live-matrix?limit=500')
        .expect(200);

      expect(response.body.limit).toBe(100);
    });

    it('supports sector filtering', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Filter Test',
        datasetVersion: 'v1.0.0',
        checksum: 'ghi789',
        recordCount: 5,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      em.create(LiveMatrixData, {
        dataset,
        year: 2025,
        sector: 'Technology',
        jobRole: 'Software Engineer',
        skillCategory: 'Engineering',
        demandIndex: 0.9,
        supplyIndex: 0.7,
        growthRate: 15.0,
      });
      em.create(LiveMatrixData, {
        dataset,
        year: 2025,
        sector: 'Healthcare',
        jobRole: 'Nurse',
        skillCategory: 'Medical',
        demandIndex: 0.8,
        supplyIndex: 0.6,
        growthRate: 10.0,
      });
      await em.flush();

      const response = await request(app.getHttpServer())
        .get('/api/live-matrix?sector=tech')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sector).toBe('Technology');
    });

    it('supports job role filtering', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Role Filter Test',
        datasetVersion: 'v1.0.0',
        checksum: 'jkl012',
        recordCount: 3,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      em.create(LiveMatrixData, {
        dataset,
        year: 2025,
        sector: 'Technology',
        jobRole: 'Data Analyst',
        skillCategory: 'Analytics',
        demandIndex: 0.85,
        supplyIndex: 0.6,
        growthRate: 12.0,
      });
      em.create(LiveMatrixData, {
        dataset,
        year: 2025,
        sector: 'Technology',
        jobRole: 'Data Scientist',
        skillCategory: 'Analytics',
        demandIndex: 0.9,
        supplyIndex: 0.65,
        growthRate: 18.0,
      });
      await em.flush();

      const response = await request(app.getHttpServer())
        .get('/api/live-matrix?jobRole=analyst')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].jobRole).toBe('Data Analyst');
    });
  });

  describe('GET /api/datasets', () => {
    it('returns empty array when no datasets exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/datasets')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns datasets ordered by downloadedAt DESC', async () => {
      const now = new Date();
      const old = new Date(now.getTime() - 86400000); // 1 day ago

      const dataset1 = em.create(Dataset, {
        datasetName: 'Old Dataset',
        datasetVersion: 'v0.9.0',
        checksum: 'old123',
        recordCount: 5,
        status: DatasetStatus.COMPLETED,
        downloadedAt: old,
      });
      const dataset2 = em.create(Dataset, {
        datasetName: 'New Dataset',
        datasetVersion: 'v1.0.0',
        checksum: 'new456',
        recordCount: 10,
        status: DatasetStatus.COMPLETED,
        downloadedAt: now,
      });
      await em.persistAndFlush([dataset1, dataset2]);

      const response = await request(app.getHttpServer())
        .get('/api/datasets')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].datasetName).toBe('New Dataset');
      expect(response.body[1].datasetName).toBe('Old Dataset');
    });

    it('limits results to 10 datasets', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Base Dataset',
        datasetVersion: 'v1.0.0',
        checksum: 'base789',
        recordCount: 5,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      // Create 15 datasets
      for (let i = 0; i < 15; i++) {
        em.create(Dataset, {
          datasetName: `Dataset ${i}`,
          datasetVersion: `v1.${i}.0`,
          checksum: `chk${i}`,
          recordCount: 5,
          status: DatasetStatus.COMPLETED,
          downloadedAt: new Date(Date.now() - i * 3600000),
        });
      }
      await em.flush();

      const response = await request(app.getHttpServer())
        .get('/api/datasets')
        .expect(200);

      expect(response.body).toHaveLength(10);
    });
  });

  describe('GET /api/dataset-diff', () => {
    it('returns empty array when no diffs exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dataset-diff')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns diffs for a specific dataset when newDatasetId is provided', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Diff Test Dataset',
        datasetVersion: 'v1.0.0',
        checksum: 'diff123',
        recordCount: 5,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      const diff = em.create(DatasetDiff, {
        datasetNew: dataset,
        datasetPrevious: dataset,
        fieldName: 'growthRate',
        oldValue: '10.0',
        newValue: '15.0',
        changeType: ChangeType.VALUE_CHANGE,
        detectedAt: new Date(),
      });
      await em.persistAndFlush(diff);

      const response = await request(app.getHttpServer())
        .get(`/api/dataset-diff?newDatasetId=${dataset.id}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].fieldName).toBe('growthRate');
    });
  });

  describe('GET /api/trends', () => {
    it('returns empty array when no trends exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/trends')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('returns trends from the latest completed dataset', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Trend Test Dataset',
        datasetVersion: 'v1.0.0',
        checksum: 'trend123',
        recordCount: 5,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      const trend = em.create(TrendSignal, {
        dataset,
        sector: 'Technology',
        jobRole: 'AI Engineer',
        trendType: 'EMERGING',
        trendScore: 0.92,
        confidence: 0.88,
      });
      await em.persistAndFlush(trend);

      const response = await request(app.getHttpServer())
        .get('/api/trends')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].jobRole).toBe('AI Engineer');
      expect(response.body[0].trendScore).toBe(0.92);
    });

    it('supports sector filtering', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Trend Filter Test',
        datasetVersion: 'v1.0.0',
        checksum: 'trend456',
        recordCount: 5,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      em.create(TrendSignal, {
        dataset,
        sector: 'Technology',
        jobRole: 'Software Engineer',
        trendType: 'GROWTH',
        trendScore: 0.85,
        confidence: 0.8,
      });
      em.create(TrendSignal, {
        dataset,
        sector: 'Healthcare',
        jobRole: 'Nurse',
        trendType: 'STABLE',
        trendScore: 0.7,
        confidence: 0.75,
      });
      await em.flush();

      const response = await request(app.getHttpServer())
        .get('/api/trends?sector=health')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].sector).toBe('Healthcare');
    });

    it('limits results to 20 trends ordered by trendScore DESC', async () => {
      const dataset = em.create(Dataset, {
        datasetName: 'Trend Limit Test',
        datasetVersion: 'v1.0.0',
        checksum: 'trend789',
        recordCount: 5,
        status: DatasetStatus.COMPLETED,
        downloadedAt: new Date(),
      });
      await em.persistAndFlush(dataset);

      // Create 25 trends with varying scores
      for (let i = 0; i < 25; i++) {
        em.create(TrendSignal, {
          dataset,
          sector: 'Technology',
          jobRole: `Role ${i}`,
          trendType: 'GROWTH',
          trendScore: 0.5 + i * 0.02,
          confidence: 0.8,
        });
      }
      await em.flush();

      const response = await request(app.getHttpServer())
        .get('/api/trends')
        .expect(200);

      expect(response.body).toHaveLength(20);
      // Highest scores first
      expect(response.body[0].trendScore).toBeGreaterThan(
        response.body[19].trendScore,
      );
    });
  });
});
