import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { UserProfile } from '@app/entities/user-profile.entity';

@Module({
  imports: [MikroOrmModule.forFeature([UserProfile])],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
