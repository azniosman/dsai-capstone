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
import { RagModule } from '../rag/rag.module';
import { SystemTerminalService } from './system-terminal.service';
import { SystemDocument } from '../entities/system-document.entity';
import { CareerToolsService } from './career-tools.service';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [
    ConfigModule,
    MikroOrmModule.forFeature([UserProfile, JobRole, SystemDocument]),
    RagModule,
    DomainModule,
  ],
  controllers: [IntelligenceController, UploadController],
  providers: [
    IntelligenceService,
    LlmService,
    CopilotService,
    CareerToolsService,
    SystemTerminalService,
  ],
  exports: [
    IntelligenceService,
    LlmService,
    CopilotService,
    CareerToolsService,
    SystemTerminalService,
  ],
})
export class IntelligenceModule {}
