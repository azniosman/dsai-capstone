import { Controller, Get, Query, Param } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { TrendSignal } from '../entities/trend-signal.entity';
import { LiveMatrixData } from '../entities/live-matrix-data.entity';
import { Dataset, DatasetStatus } from '../entities/dataset.entity';
import { DatasetDiff } from '../entities/dataset-diff.entity';

@Controller('api')
export class DataIntelligenceController {
  constructor(private readonly em: EntityManager) {}

  @Get('live-matrix')
  async getLiveMatrix(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('sort') sort: string = 'demandIndex',
    @Query('dir') dir: string = 'desc',
    @Query('sector') sector?: string,
    @Query('jobRole') jobRole?: string,
  ) {
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    
    // Default to the latest COMPLETED dataset
    const latestDataset = await this.em.findOne(Dataset, { status: DatasetStatus.COMPLETED as DatasetStatus }, { orderBy: { downloadedAt: 'DESC' } });
    
    if (!latestDataset) {
      return { data: [], total: 0, page: p, limit: l, dataset: null };
    }

    const where: any = { dataset: latestDataset };
    if (sector) where.sector = { $ilike: `%${sector}%` };
    if (jobRole) where.jobRole = { $ilike: `%${jobRole}%` };

    const [data, total] = await this.em.findAndCount(LiveMatrixData, where, {
      limit: l,
      offset: (p - 1) * l,
      orderBy: { [sort]: dir === 'asc' ? 'ASC' : 'DESC' },
    });

    return { data, total, page: p, limit: l, dataset: latestDataset };
  }

  @Get('datasets')
  async getDatasets() {
    const datasets = await this.em.find(Dataset, {}, { orderBy: { downloadedAt: 'DESC' }, limit: 10 });
    return datasets;
  }

  @Get('dataset-diff')
  async getDatasetDiff(@Query('newDatasetId') newDatasetId: string) {
    if (!newDatasetId) {
      // Find latest diffs based on newest completed dataset
      const latestDataset = await this.em.findOne(Dataset, { status: DatasetStatus.COMPLETED as DatasetStatus }, { orderBy: { downloadedAt: 'DESC' } });
      if (!latestDataset) return [];
      return await this.em.find(DatasetDiff, { datasetNew: latestDataset }, { orderBy: { detectedAt: 'DESC' } });
    }
    
    return await this.em.find(DatasetDiff, { datasetNew: parseInt(newDatasetId) }, { orderBy: { detectedAt: 'DESC' } });
  }

  @Get('trends')
  async getTrends(@Query('sector') sector?: string) {
    // Only return trends from the latest dataset
    const latestDataset = await this.em.findOne(Dataset, { status: DatasetStatus.COMPLETED as DatasetStatus }, { orderBy: { downloadedAt: 'DESC' } });
    if (!latestDataset) return [];

    const where: any = { dataset: latestDataset };
    if (sector) where.sector = { $ilike: `%${sector}%` };

    return await this.em.find(TrendSignal, where, { orderBy: { trendScore: 'DESC' }, limit: 20 });
  }
}
