import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ClsModule } from 'nestjs-cls';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
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
import { InternalModule } from './internal/internal.module';
import { RagModule } from './rag/rag.module';
import { DataIntelligenceModule } from './data-intelligence/data-intelligence.module';
import { ProductionAssuranceModule } from './production-assurance/production-assurance.module';
import mikroOrmConfig from './mikro-orm.config';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: () => randomUUID(),
      },
    }),
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
    InternalModule,
    RagModule,
    DataIntelligenceModule,
    ProductionAssuranceModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
