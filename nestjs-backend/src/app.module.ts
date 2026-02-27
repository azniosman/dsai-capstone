import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from '@app/common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProfileModule } from './profile/profile.module';
import { SkillsModule } from './skills/skills.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { UpskillingModule } from './upskilling/upskilling.module';
import { RolesModule } from './roles/roles.module';
import { CoursesModule } from './courses/courses.module';
import { DomainModule } from './domain/domain.module';
import { SsgModule } from './ssg/ssg.module';
import mikroOrmConfig from './mikro-orm.config';

@Module({
  imports: [
    CommonModule,
    MikroOrmModule.forRoot(mikroOrmConfig),
    AuthModule,
    UsersModule,
    ProfileModule,
    SkillsModule,
    IntelligenceModule,
    UpskillingModule,
    RolesModule,
    CoursesModule,
    DomainModule,
    SsgModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
