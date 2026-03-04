import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DocumentChunk } from '@app/entities/document-chunk.entity';
import { EmbeddingService } from './embedding.service';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';

@Module({
  imports: [MikroOrmModule.forFeature([DocumentChunk])],
  controllers: [RagController],
  providers: [EmbeddingService, RagService],
  exports: [EmbeddingService, RagService],
})
export class RagModule {}
