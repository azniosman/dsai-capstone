import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { SsgModule } from '../ssg/ssg.module';
import { DomainModule } from '../domain/domain.module';

/**
 * Module that registers the internal automation endpoints.
 *
 * By design, routes on {@link InternalController} are only reachable via
 * Lambda Invoke API (Lambda-to-Lambda IPC). They are NOT wired into any
 * public API Gateway route.
 */
@Module({
  imports: [SsgModule, DomainModule],
  controllers: [InternalController],
})
export class InternalModule {}
