import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = new Logger('MikroORM');

const config: Options = {
  driver: PostgreSqlDriver,
  clientUrl: process.env.DATABASE_URL,
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  user: process.env.DATABASE_USER || 'capstone',
  password: process.env.DATABASE_PASSWORD || 'changeme',
  dbName: process.env.DATABASE_NAME || 'capstone',
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  debug: process.env.NODE_ENV !== 'production',
  logger: logger.log.bind(logger),
  allowGlobalContext: true, // Required for production assurance background monitoring
  migrations: {
    path: './dist/migrations',
    pathTs: './src/migrations',
  },
  extensions: [Migrator],
  seeder: {
    path: './dist/seeders',
    pathTs: './src/seeders',
  },
};

export default config;
