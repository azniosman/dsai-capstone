import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { SkillProgress } from '@app/entities/skill-progress.entity';
import { UserProfile } from '@app/entities/user-profile.entity';

@Module({
  imports: [MikroOrmModule.forFeature([SkillProgress, UserProfile])],
  controllers: [SkillsController],
  providers: [SkillsService],
})
export class SkillsModule {}
