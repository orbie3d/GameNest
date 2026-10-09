import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Environment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  CORS_ORIGIN: string;
  POSTGRES_HOST: string;
  POSTGRES_PORT: number;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
  JWT_ACCESS_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
}

export function environmentFile(): string | undefined {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production') return undefined;
  const rootPath = resolve('apps/backend/.env');
  return existsSync(rootPath) ? rootPath : resolve('.env');
}

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const errors: string[] = [];
  const required = (key: string): string => {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push(key);
      return '';
    }
    return value;
  };
  const integer = (key: string, fallback: number | undefined, min: number, max: number): number => {
    const value = input[key] === undefined ? fallback : Number(input[key]);
    if (value === undefined || !Number.isInteger(value) || value < min || value > max) {
      errors.push(key);
      return 0;
    }
    return value;
  };

  const nodeEnv = input.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(nodeEnv))) errors.push('NODE_ENV');
  const corsOrigin = required('CORS_ORIGIN');
  for (const origin of corsOrigin.split(',').map((value) => value.trim())) {
    try {
      const url = new URL(origin);
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) errors.push('CORS_ORIGIN');
    } catch {
      errors.push('CORS_ORIGIN');
    }
  }
  const jwtSecret = required('JWT_ACCESS_SECRET');
  if (jwtSecret.length < 32 || jwtSecret.startsWith('replace-with')) errors.push('JWT_ACCESS_SECRET');

  const result: Environment = {
    NODE_ENV: nodeEnv as Environment['NODE_ENV'],
    PORT: integer('PORT', 3000, 1, 65535),
    CORS_ORIGIN: corsOrigin,
    POSTGRES_HOST: required('POSTGRES_HOST'),
    POSTGRES_PORT: integer('POSTGRES_PORT', undefined, 1, 65535),
    POSTGRES_USER: required('POSTGRES_USER'),
    POSTGRES_PASSWORD: required('POSTGRES_PASSWORD'),
    POSTGRES_DB: required('POSTGRES_DB'),
    JWT_ACCESS_SECRET: jwtSecret,
    JWT_ACCESS_TTL_SECONDS: integer('JWT_ACCESS_TTL_SECONDS', 900, 60, 3600),
    REFRESH_TOKEN_TTL_SECONDS: integer('REFRESH_TOKEN_TTL_SECONDS', 2592000, 3600, 7776000),
  };
  if (errors.length > 0) throw new Error(`Invalid environment variables: ${[...new Set(errors)].join(', ')}`);
  return result;
}
