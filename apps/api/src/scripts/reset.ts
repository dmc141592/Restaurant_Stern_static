import 'dotenv/config';
import { Client } from 'pg';

/**
 * Drops and recreates the `public` schema, then re-runs `migrate.ts` via a
 * child process. Intended for local development only — never point this at
 * a database you care about.
 */
async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist nicht gesetzt.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('db:reset darf nicht in production ausgeführt werden.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    console.log('Setze Schema "public" zurück...');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
  } finally {
    await client.end();
  }

  console.log('Schema zurückgesetzt. Führe Migrationen erneut aus...');
  await import('./migrate.js');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
