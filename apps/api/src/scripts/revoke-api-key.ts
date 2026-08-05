import 'dotenv/config';
import { loadConfig } from '../config/index.js';
import { closePool, createPool } from '../db/client.js';
import { revokeApiKey } from '../services/api-keys.service.js';

/** Usage: npm run apikey:revoke --workspace apps/api -- <key-prefix> */
async function main(): Promise<void> {
  const prefix = process.argv[2];
  if (!prefix) {
    throw new Error('Bitte das Präfix des zu widerrufenden API-Keys angeben.');
  }

  const config = loadConfig();
  const pool = createPool(config);
  try {
    const revoked = await revokeApiKey(pool, prefix);
    console.log(revoked ? `API-Key mit Präfix ${prefix} wurde widerrufen.` : `Kein aktiver API-Key mit Präfix ${prefix} gefunden.`);
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
