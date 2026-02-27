import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UpskillingController } from './upskilling.controller';
import { UpskillingService } from './upskilling.service';
import { SCTPCourse } from '../entities/sctp-course.entity';
import { UserProfile } from '../entities/user-profile.entity';
import { JobRole } from '../entities/job-role.entity';

@Module({
  imports: [MikroOrmModule.forFeature([SCTPCourse, UserProfile, JobRole])],
  controllers: [UpskillingController],
  providers: [UpskillingService],
  exports: [UpskillingService],
})
export class UpskillingModule {}
