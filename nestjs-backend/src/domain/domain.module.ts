import { Module, Global } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DomainService } from './domain.service';
import { DomainController } from './domain.controller';
import { SCTPCourse } from '@app/entities/sctp-course.entity';
import { MarketInsight } from '@app/entities/market-insight.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { JobRole } from '@app/entities/job-role.entity';
import { SkillProgress } from '@app/entities/skill-progress.entity';

@Global()
@Module({
  imports: [
    MikroOrmModule.forFeature([
      SCTPCourse,
      MarketInsight,
      UserProfile,
      JobRole,
      SkillProgress,
    ]),
  ],
  controllers: [DomainController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
