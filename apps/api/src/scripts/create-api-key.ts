import 'dotenv/config';
import { loadConfig } from '../config/index.js';
import { closePool, createPool } from '../db/client.js';
import { createApiKey } from '../services/api-keys.service.js';

/**
 * Usage: npm run apikey:create --workspace apps/api -- "POS Kasse Hauptstandort"
 * Prints the plaintext key exactly once — store it in the POS system's own
 * secret storage immediately. Only its hash and a short prefix are kept.
 */
async function main(): Promise<void> {
  const name = process.argv[2];
  if (!name || name.trim().length === 0) {
    throw new Error('Bitte einen Namen für den API-Key angeben, z.B. "POS Kasse Hauptstandort".');
  }

  const config = loadConfig();
  const pool = createPool(config);
  try {
    const result = await createApiKey(pool, config, name.trim());
    console.log('API-Key erstellt. Dieser Wert wird nur jetzt angezeigt:');
    console.log('');
    console.log(`  ${result.plaintextKey}`);
    console.log('');
    console.log(`Präfix (zur Wiedererkennung, nicht geheim): ${result.prefix}`);
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
