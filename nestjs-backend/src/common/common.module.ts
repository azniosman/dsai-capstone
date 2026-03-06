import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { validate } from './config/env.validation';
import { LogBusService } from './log-bus.service';
import { LogController } from './log.controller';
import { SystemLog } from './system-log.entity';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env'],
    }),
    MikroOrmModule.forFeature([SystemLog]),
  ],
  controllers: [LogController],
  providers: [LogBusService],
  exports: [ConfigModule, LogBusService],
})
export class CommonModule {}
