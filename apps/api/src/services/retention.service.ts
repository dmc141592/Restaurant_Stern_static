import type { Pool } from 'pg';
import type { AppConfig } from '../config/index.js';
import * as reservationsRepo from '../repositories/reservations.repository.js';

/**
 * Anonymises (never hard-deletes, to preserve booking-history integrity for
 * capacity reporting) personal data on reservations whose stay ended more
 * than `PERSONAL_DATA_RETENTION_DAYS` ago. Intended to run on a schedule
 * (see `scripts/run-retention-job.ts` and the README's deployment section).
 */
export async function anonymiseExpiredReservations(
  pool: Pool,
  config: AppConfig,
  batchSize = 500,
): Promise<number> {
  const cutoff = new Date(Date.now() - config.personalDataRetentionDays * 24 * 60 * 60 * 1000);
  const candidates = await reservationsRepo.findReservationsOlderThan(pool, cutoff, batchSize);
  for (const reservation of candidates) {
    await reservationsRepo.anonymiseReservation(pool, reservation.id);
  }
  return candidates.length;
}
