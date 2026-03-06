import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Dataset } from '../entities/dataset.entity';
import { LiveMatrixData } from '../entities/live-matrix-data.entity';
import { TrendSignal } from '../entities/trend-signal.entity';

@Injectable()
export class TrendEngineService {
  private readonly logger = new Logger(TrendEngineService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Generates macro trend signals based on the newest dataset's metrics.
   * Can evaluate historical delta if evaluating multiple datasets.
   */
  async generateTrendSignals(datasetId: number): Promise<void> {
    const dataset = await this.em.findOne(Dataset, { id: datasetId });
    if (!dataset) throw new Error('Dataset not found');

    this.logger.log(`Analyzing market trends for Dataset ${datasetId}...`);

    const records = await this.em.find(LiveMatrixData, { dataset });
    if (!records.length) return;

    // Clear existing trends for this dataset to remain idempotent
    await this.em.nativeDelete(TrendSignal, { dataset: datasetId as any });

    const signals: TrendSignal[] = [];

    for (const record of records) {
      // 1. High Growth Detection
      if (record.growthRate >= 15) {
        signals.push(this.em.create(TrendSignal, {
          dataset,
          sector: record.sector,
          jobRole: record.jobRole,
          trendType: 'HIGH_GROWTH',
          trendScore: record.growthRate,
          confidence: 0.95,
        }));
      }

      // 2. Declining Demand
      if (record.growthRate <= -5 || record.demandIndex < 0.2) {
        signals.push(this.em.create(TrendSignal, {
          dataset,
          sector: record.sector,
          jobRole: record.jobRole,
          trendType: 'DECLINING_DEMAND',
          trendScore: record.growthRate,
          confidence: 0.85,
        }));
      }

      // 3. Emerging Skills / Supply Gap
      const supplyGap = record.demandIndex - record.supplyIndex;
      if (supplyGap > 0.4 && record.growthRate > 5) {
        signals.push(this.em.create(TrendSignal, {
          dataset,
          sector: record.sector,
          jobRole: record.jobRole,
          trendType: 'EMERGING_SKILL',
          trendScore: supplyGap,
          confidence: 0.9,
        }));
      }
    }

    if (signals.length > 0) {
      this.logger.log(`Synthesized ${signals.length} strategic trend signals for Dataset ${datasetId}.`);
      this.em.persist(signals);
      await this.em.flush();
    }
  }
}
