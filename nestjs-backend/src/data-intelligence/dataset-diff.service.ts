import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Dataset, DatasetStatus } from '../entities/dataset.entity';
import { LiveMatrixData } from '../entities/live-matrix-data.entity';
import { DatasetDiff, ChangeType } from '../entities/dataset-diff.entity';

@Injectable()
export class DatasetDiffService {
  private readonly logger = new Logger(DatasetDiffService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Compares a newly ingested dataset against the immediate previous snapshot.
   */
  async generateDiffs(newDatasetId: number): Promise<void> {
    const newDataset = await this.em.findOne(Dataset, { id: newDatasetId });
    if (!newDataset) throw new Error('New dataset not found');

    const previousDataset = await this.em.findOne(
      Dataset,
      { status: DatasetStatus.COMPLETED, id: { $ne: newDatasetId } },
      { orderBy: { downloadedAt: 'DESC' } }
    );

    if (!previousDataset) {
      this.logger.log(`No previous dataset found. Base initialization completed for ${newDatasetId}.`);
      return;
    }

    this.logger.log(`Comparing Dataset ${newDatasetId} against previous Dataset ${previousDataset.id}...`);

    const newRecords = await this.em.find(LiveMatrixData, { dataset: newDataset });
    const oldRecords = await this.em.find(LiveMatrixData, { dataset: previousDataset });

    const newMap = new Map(newRecords.map(r => [`${r.sector}-${r.jobRole}`, r]));
    const oldMap = new Map(oldRecords.map(r => [`${r.sector}-${r.jobRole}`, r]));

    const diffs: DatasetDiff[] = [];

    // Check for NEW or UPDATED records
    for (const [key, newRecord] of newMap.entries()) {
      const oldRecord = oldMap.get(key);

      if (!oldRecord) {
        diffs.push(this.em.create(DatasetDiff, {
          datasetNew: newDataset,
          datasetPrevious: previousDataset,
          fieldName: 'record',
          oldValue: null,
          newValue: JSON.stringify({ sector: newRecord.sector, jobRole: newRecord.jobRole }),
          changeType: ChangeType.NEW_RECORD,
        }));
      } else {
        // Check for value fluctuations
        if (Math.abs(newRecord.demandIndex - oldRecord.demandIndex) > 0.01) {
          diffs.push(this.em.create(DatasetDiff, {
            datasetNew: newDataset,
            datasetPrevious: previousDataset,
            fieldName: 'demandIndex',
            oldValue: oldRecord.demandIndex.toString(),
            newValue: newRecord.demandIndex.toString(),
            changeType: ChangeType.VALUE_CHANGE,
          }));
        }
        
        if (Math.abs(newRecord.growthRate - oldRecord.growthRate) > 0.01) {
          diffs.push(this.em.create(DatasetDiff, {
            datasetNew: newDataset,
            datasetPrevious: previousDataset,
            fieldName: 'growthRate',
            oldValue: oldRecord.growthRate.toString(),
            newValue: newRecord.growthRate.toString(),
            changeType: ChangeType.VALUE_CHANGE,
          }));
        }
      }
    }

    // Check for REMOVED records
    for (const [key, oldRecord] of oldMap.entries()) {
      if (!newMap.has(key)) {
        diffs.push(this.em.create(DatasetDiff, {
          datasetNew: newDataset,
          datasetPrevious: previousDataset,
          fieldName: 'record',
          oldValue: JSON.stringify({ sector: oldRecord.sector, jobRole: oldRecord.jobRole }),
          newValue: null,
          changeType: ChangeType.REMOVED_RECORD,
        }));
      }
    }

    // Batch insert diffs
    if (diffs.length > 0) {
      this.logger.log(`Generated ${diffs.length} diffs between Dataset ${newDatasetId} and ${previousDataset.id}.`);
      this.em.persist(diffs);
      await this.em.flush();
    } else {
      this.logger.log(`No variations detected between Dataset ${newDatasetId} and ${previousDataset.id}.`);
    }
  }
}
