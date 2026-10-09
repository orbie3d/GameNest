import type { DataSourceOptions } from 'typeorm';
import * as pg from 'pg';
import { Environment } from '../app/environment';
import { AuthSessionEntity } from '../auth/auth-session.entity';
import { UserEntity } from '../users/user.entity';
import { CreateAuthTables1791417600000 } from './migrations/1791417600000-create-auth-tables';

export function databaseOptions(env: Environment): DataSourceOptions {
  return {
    type: 'postgres',
    host: env.POSTGRES_HOST,
    port: env.POSTGRES_PORT,
    username: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    driver: pg,
    entities: [UserEntity, AuthSessionEntity],
    migrations: [CreateAuthTables1791417600000],
    synchronize: false,
    migrationsRun: false,
    logging: false,
  };
}
