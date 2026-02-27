import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SCTPCourse } from '@app/entities/sctp-course.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [MikroOrmModule.forFeature([SCTPCourse, UserProfile])],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
