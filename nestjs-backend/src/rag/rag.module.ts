import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DocumentChunk } from '@app/entities/document-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { CrossEncoderService } from './cross-encoder.service';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { RagPipelineService } from './rag-pipeline.service';

@Module({
  imports: [MikroOrmModule.forFeature([DocumentChunk])],
  controllers: [RagController],
  providers: [
    EmbeddingService,
    CrossEncoderService,
    RagService,
    RagPipelineService,
  ],
  exports: [
    EmbeddingService,
    CrossEncoderService,
    RagService,
    RagPipelineService,
  ],
})
export class RagModule {}
