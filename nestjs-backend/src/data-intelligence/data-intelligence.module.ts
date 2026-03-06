import { Module } from '@nestjs/common';
import { DataIngestionService } from './data-ingestion.service';
import { DatasetDiffService } from './dataset-diff.service';
import { TrendEngineService } from './trend-engine.service';
import { DataIntelligenceController } from './data-intelligence.controller';

@Module({
  providers: [DataIngestionService, DatasetDiffService, TrendEngineService],
  controllers: [DataIntelligenceController],
  exports: [DataIngestionService, DatasetDiffService, TrendEngineService],
})
export class DataIntelligenceModule {}
