import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConfigModule } from '@nestjs/config';
import { IntelligenceService } from './intelligence.service';
import { IntelligenceController } from './intelligence.controller';
import { UploadController } from './upload.controller';
import { LlmService } from './llm.service';
import { CopilotService } from './copilot.service';
import { UserProfile } from '@app/entities/user-profile.entity';
import { JobRole } from '@app/entities/job-role.entity';
import { DomainModule } from '../domain/domain.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    ConfigModule,
    MikroOrmModule.forFeature([UserProfile, JobRole]),
    DomainModule,
    RagModule,
  ],
  controllers: [IntelligenceController, UploadController],
  providers: [IntelligenceService, LlmService, CopilotService],
  exports: [IntelligenceService, LlmService, CopilotService],
})
export class IntelligenceModule {}
