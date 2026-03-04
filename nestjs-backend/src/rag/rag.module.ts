import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DocumentChunk } from '@app/entities/document-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { CrossEncoderService } from './cross-encoder.service';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';

@Module({
  imports: [MikroOrmModule.forFeature([DocumentChunk])],
  controllers: [RagController],
  providers: [EmbeddingService, CrossEncoderService, RagService],
  exports: [EmbeddingService, CrossEncoderService, RagService],
})
export class RagModule {}
