import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { UsersService } from './users.service';
import { User } from '@app/entities/user.entity';
import { Tenant } from '@app/entities/tenant.entity';

@Module({
  imports: [MikroOrmModule.forFeature([User, Tenant])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
