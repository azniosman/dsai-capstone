import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { DataIngestionService } from '../data-intelligence/data-ingestion.service';
import { DatasetDiffService } from '../data-intelligence/dataset-diff.service';
import { TrendEngineService } from '../data-intelligence/trend-engine.service';
import { InternalTokenGuard } from '@app/common/guards/internal-token.guard';

@Controller('internal/dataset-sync')
@UseGuards(InternalTokenGuard)
export class DatasetSyncController {
  private readonly logger = new Logger(DatasetSyncController.name);

  constructor(
    private readonly dataIngestionService: DataIngestionService,
    private readonly datasetDiffService: DatasetDiffService,
    private readonly trendEngineService: TrendEngineService,
  ) {}

  @Post()
  async syncDataset() {
    this.logger.log('Initiating automated dataset synchronization pipeline...');

    // Usually, this URL would be dynamically loaded from a global config or env var.
    // For capstone context, we mock a stable public structural URL or use a local seed string 
    // to simulate the pipeline.
    const SOURCE_URL = process.env.LIVE_MATRIX_SOURCE_URL || 'https://raw.githubusercontent.com/azniosman/dsai-capstone/main/data/seed/skills_intelligence.csv';
    const NEXT_VERSION = `v${new Date().toISOString().split('T')[0].replace(/-/g, '')}`;

    // 1. Ingest Data (Download -> Parse -> Valiate -> Store)
    const dataset = await this.dataIngestionService.ingestFromUrl(
      'Singapore_Skills_Market',
      NEXT_VERSION,
      SOURCE_URL,
      'csv'
    );

    // 2. Generate Diffs
    await this.datasetDiffService.generateDiffs(dataset.id);

    // 3. Compute Macro Trends
    await this.trendEngineService.generateTrendSignals(dataset.id);

    this.logger.log('Dataset synchronization pipeline completed successfully.');
    return { success: true, datasetId: dataset.id, version: dataset.datasetVersion };
  }
}
