import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { parse } from 'csv-parse/sync';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { Dataset, DatasetStatus } from '../entities/dataset.entity';
import { LiveMatrixData } from '../entities/live-matrix-data.entity';

@Injectable()
export class DataIngestionService {
  private readonly logger = new Logger(DataIngestionService.name);

  constructor(private readonly em: EntityManager) {}

  /**
   * Orchestrates the downloading, validation, and storage of a new dataset iteration.
   */
  async ingestFromUrl(
    datasetName: string,
    version: string,
    sourceUrl: string,
    formatHint?: 'csv' | 'json' | 'xlsx',
  ): Promise<Dataset> {
    this.logger.log(
      `Starting ingestion for ${datasetName} v${version} from ${sourceUrl}`,
    );

    // Prevent duplicate versions
    const existing = await this.em.findOne(Dataset, {
      datasetName,
      datasetVersion: version,
    });
    if (existing && existing.status === DatasetStatus.COMPLETED) {
      this.logger.warn(
        `Dataset ${datasetName} v${version} already exists. Skipping ingestion.`,
      );
      return existing;
    }

    // Initialize dataset record
    const dataset =
      existing ||
      this.em.create(Dataset, {
        datasetName,
        datasetVersion: version,
        sourceUrl,
        checksum: 'pending',
        status: DatasetStatus.PROCESSING,
      });

    if (!existing) {
      await this.em.persistAndFlush(dataset);
    } else {
      dataset.status = DatasetStatus.PROCESSING;
      await this.em.flush();
    }

    try {
      this.logger.log(`Downloading dataset...`);
      const buffer = await this.downloadFileWithRetry(sourceUrl);

      const checksum = this.calculateChecksum(buffer);
      dataset.checksum = checksum;

      this.logger.log(`Parsing dataset...`);
      const parsedData = this.detectAndParse(buffer, sourceUrl, formatHint);

      this.logger.log(`Validating dataset structure...`);
      this.validateStructure(parsedData);

      dataset.recordCount = parsedData.length;

      this.logger.log(`Storing ${parsedData.length} records...`);
      await this.storeMatrixData(dataset, parsedData);

      dataset.status = DatasetStatus.COMPLETED;
      dataset.processedAt = new Date();
      await this.em.flush();

      this.logger.log(
        `DATASET_STORED successfully: ${datasetName} v${version}`,
      );
      return dataset;
    } catch (error: any) {
      this.logger.error(`DATASET_VALIDATION_FAILED: ${error.message}`);
      dataset.status = DatasetStatus.FAILED;
      await this.em.flush();

      // Fallback behavior: We leave the DB alone, and downstream services will just use the last COMPLETED dataset.
      throw new BadRequestException(`Ingestion failed: ${error.message}`);
    }
  }

  /**
   * Exponential backoff retry for fetching external datasets
   */
  private async downloadFileWithRetry(
    url: string,
    maxRetries = 3,
  ): Promise<Buffer> {
    // Handle local file paths (check for absolute paths or file:// protocol)
    if (
      url.startsWith('file://') ||
      url.startsWith('/') ||
      url.startsWith('./')
    ) {
      const filePath = url.replace('file://', '');
      this.logger.log(`Reading local file: ${filePath}`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Local file not found: ${filePath}`);
      }
      return fs.readFileSync(filePath);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw new Error(
            `Failed to download dataset after ${maxRetries} attempts: ${error.message}`,
          );
        }
        const delay = Math.pow(2, attempt) * 1000;
        this.logger.warn(`Download failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable');
  }

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  private detectAndParse(buffer: Buffer, url: string, hint?: string): any[] {
    const extension = hint || url.split('.').pop()?.toLowerCase();

    try {
      if (extension === 'csv') {
        return parse(buffer, { columns: true, skip_empty_lines: true });
      } else if (extension === 'json') {
        return JSON.parse(buffer.toString('utf-8'));
      } else if (extension === 'xlsx' || extension === 'xls') {
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        // Fallback robust sniffing (try JSON, then CSV)
        const str = buffer.toString('utf-8');
        if (str.trim().startsWith('[') || str.trim().startsWith('{')) {
          return JSON.parse(str);
        }
        return parse(str, { columns: true, skip_empty_lines: true });
      }
    } catch (e: any) {
      throw new Error(`Failed to parse dataset format: ${e.message}`);
    }
  }

  private validateStructure(data: any[]) {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Dataset is empty or not an array');
    }
    const firstRow = data[0];
    const requiredColumns = ['year', 'sector', 'jobRole', 'skillCategory'];

    for (const col of requiredColumns) {
      // Allow slight variations like 'job_role' or 'jobRole'
      const hasCol =
        col in firstRow ||
        col.replace(/([A-Z])/g, '_$1').toLowerCase() in firstRow;
      if (!hasCol) {
        throw new Error(`Missing required column: ${col}`);
      }
    }
  }

  private async storeMatrixData(dataset: Dataset, data: any[]) {
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      const entities = batch.map((row) => {
        return this.em.create(LiveMatrixData, {
          dataset,
          year: parseInt(row.year || row.Year) || new Date().getFullYear(),
          sector: row.sector || row.Sector || 'Unknown',
          jobRole: row.jobRole || row.job_role || row['Job Role'] || 'Unknown',
          skillCategory:
            row.skillCategory ||
            row.skill_category ||
            row['Skill Category'] ||
            'Unknown',
          demandIndex:
            parseFloat(
              row.demandIndex || row.demand_index || row['Demand Index'],
            ) || 0,
          supplyIndex:
            parseFloat(
              row.supplyIndex || row.supply_index || row['Supply Index'],
            ) || 0,
          growthRate:
            parseFloat(
              row.growthRate || row.growth_rate || row['Growth Rate'],
            ) || 0,
        });
      });

      this.em.persist(entities);
      await this.em.flush();
    }
  }
}
