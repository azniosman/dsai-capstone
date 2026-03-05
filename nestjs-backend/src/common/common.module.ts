import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { LogBusService } from './log-bus.service';
import { LogController } from './log.controller';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env'],
    }),
  ],
  controllers: [LogController],
  providers: [LogBusService],
  exports: [ConfigModule, LogBusService],
})
export class CommonModule {}

