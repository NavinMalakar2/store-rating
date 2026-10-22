import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './database/prisma';

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.error('Cannot connect to PostgreSQL. Check DATABASE_URL and that the database is running (see docs/setup-guide.md).');
    process.exit(1);
  }
  const server = createApp().listen(env.BACKEND_PORT, () => {
    console.log(JSON.stringify({ level: 'info', message: `API listening on http://localhost:${env.BACKEND_PORT}/api/v1` }));
  });
  const shutdown = () => server.close(async () => { await prisma.$disconnect(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main();
