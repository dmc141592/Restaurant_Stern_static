import 'dotenv/config';
import { applyMigrations } from '../db/apply-migrations.js';

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist nicht gesetzt.');
  }

  const appliedCount = await applyMigrations(databaseUrl);
  if (appliedCount === 0) {
    console.log('Keine neuen Migrationen. Datenbankschema ist aktuell.');
  } else {
    console.log(`${appliedCount} Migration(en) erfolgreich angewendet.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
