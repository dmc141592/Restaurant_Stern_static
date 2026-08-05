import type { DbClient } from '../db/client.js';

/**
 * Inserts the exclusive-room allocation row for a newly created blocking
 * reservation. Relies on `exclusive_allocations_no_overlap` (a partial GiST
 * exclusion constraint) to make double-booking impossible even under
 * concurrent transactions — if two transactions race, Postgres raises
 * `exclusion_violation` (SQLSTATE 23P01) for the loser.
 */
export async function insertExclusiveAllocation(
  client: DbClient,
  reservationId: string,
  areaId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<void> {
  await client.query(
    `INSERT INTO exclusive_reservation_allocations (reservation_id, area_id, time_range, is_blocking)
     VALUES ($1, $2, tstzrange($3, $4, '[)'), TRUE)`,
    [reservationId, areaId, startsAt, endsAt],
  );
}

/** Called when a PENDING/CONFIRMED reservation becomes REJECTED/CANCELLED. */
export async function releaseExclusiveAllocation(
  client: DbClient,
  reservationId: string,
): Promise<void> {
  await client.query(
    `UPDATE exclusive_reservation_allocations SET is_blocking = FALSE WHERE reservation_id = $1`,
    [reservationId],
  );
}

export async function hasBlockingExclusiveOverlap(
  client: DbClient,
  areaId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1 FROM exclusive_reservation_allocations
     WHERE area_id = $1 AND is_blocking = TRUE AND time_range && tstzrange($2, $3, '[)')
     LIMIT 1`,
    [areaId, startsAt, endsAt],
  );
  return (result.rowCount ?? 0) > 0;
}
