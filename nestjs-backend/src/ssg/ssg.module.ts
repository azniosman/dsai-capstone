import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SsgCache } from '@app/entities/ssg-cache.entity';
import { SCTPCourse } from '@app/entities/sctp-course.entity';
import { SsgClientService } from './ssg-client.service';
import { SsgCacheService } from './ssg-cache.service';
import { SsgService } from './ssg.service';
import { SsgController } from './ssg.controller';

@Module({
  imports: [MikroOrmModule.forFeature([SsgCache, SCTPCourse])],
  controllers: [SsgController],
  providers: [SsgClientService, SsgCacheService, SsgService],
  exports: [SsgService],
})
export class SsgModule {}
