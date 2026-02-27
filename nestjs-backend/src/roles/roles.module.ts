import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JobRole } from '@app/entities/job-role.entity';
import { UserProfile } from '@app/entities/user-profile.entity';
import { RolesController } from './roles.controller';
import { CompareRolesController } from './compare-roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [MikroOrmModule.forFeature([JobRole, UserProfile])],
  controllers: [RolesController, CompareRolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
