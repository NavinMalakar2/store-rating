import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

/**
 * Rebuilds the ISOLATED test database from the real migration files before the suite runs.
 * Refuses to touch any database whose name does not contain "test".
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL is not set (see .env.example)');
  const dbName = new URL(url).pathname.replace('/', '');
  if (!dbName.includes('test')) throw new Error(`Refusing to run destructive tests on database "${dbName}"`);

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const dir = path.resolve(__dirname, '../prisma/migrations');
  const folders = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isDirectory()).sort();
  for (const f of folders) await client.query(fs.readFileSync(path.join(dir, f, 'migration.sql'), 'utf8'));
  await client.end();
}
