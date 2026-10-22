import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load the monorepo root .env (no-op if the variables are already provided).
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_SECURE: z.string().default('false').transform((v) => v === 'true'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(14).default(10),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`\nInvalid or missing environment configuration:\n${lines.join('\n')}\n`);
  console.error('Copy .env.example to .env and fill in the values (see docs/setup-guide.md).');
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
