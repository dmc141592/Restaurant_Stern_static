import type { ReservationStatus } from '@sternen/shared';
import type { DbClient } from '../db/client.js';
import type { ReservationStatusHistoryEntry } from '../types/domain.js';

type ActorType = 'SYSTEM' | 'EMAIL_ACTION' | 'ADMIN' | 'POS_API';

interface HistoryRow {
  id: string;
  reservation_id: string;
  previous_status: ReservationStatus | null;
  new_status: ReservationStatus;
  actor_type: ActorType;
  actor_reference: string | null;
  created_at: Date;
}

function mapRow(row: HistoryRow): ReservationStatusHistoryEntry {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    actorType: row.actor_type,
    actorReference: row.actor_reference,
    createdAt: row.created_at,
  };
}

export async function insertStatusHistory(
  client: DbClient,
  reservationId: string,
  previousStatus: ReservationStatus | null,
  newStatus: ReservationStatus,
  actorType: ActorType,
  actorReference: string | null,
): Promise<ReservationStatusHistoryEntry> {
  const result = await client.query<HistoryRow>(
    `INSERT INTO reservation_status_history
      (reservation_id, previous_status, new_status, actor_type, actor_reference)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [reservationId, previousStatus, newStatus, actorType, actorReference],
  );
  return mapRow(result.rows[0]!);
}

export async function findStatusHistoryForReservation(
  client: DbClient,
  reservationId: string,
): Promise<ReservationStatusHistoryEntry[]> {
  const result = await client.query<HistoryRow>(
    `SELECT * FROM reservation_status_history WHERE reservation_id = $1 ORDER BY created_at`,
    [reservationId],
  );
  return result.rows.map(mapRow);
}
