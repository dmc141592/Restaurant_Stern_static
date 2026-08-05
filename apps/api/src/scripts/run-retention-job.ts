import 'dotenv/config';
import { loadConfig } from '../config/index.js';
import { closePool, createPool } from '../db/client.js';
import { anonymiseExpiredReservations } from '../services/retention.service.js';

/**
 * Anonymises personal data on reservations past PERSONAL_DATA_RETENTION_DAYS.
 * Intended to run on a schedule (e.g. a daily cron job / scheduled task in
 * the deployment platform) — see README "Datenlöschung".
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config);
  try {
    const count = await anonymiseExpiredReservations(pool, config);
    console.log(`${count} Reservation(en) anonymisiert (Aufbewahrungsfrist: ${config.personalDataRetentionDays} Tage).`);
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
