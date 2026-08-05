import type { ReservationActionType } from '@sternen/shared';
import type { DbClient } from '../db/client.js';
import type { ReservationActionToken } from '../types/domain.js';

interface TokenRow {
  id: string;
  reservation_id: string;
  action: ReservationActionType;
  token_hash: string;
  used_at: Date | null;
  revoked_at: Date | null;
  created_at: Date;
}

function mapRow(row: TokenRow): ReservationActionToken {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    action: row.action,
    tokenHash: row.token_hash,
    usedAt: row.used_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export async function insertActionToken(
  client: DbClient,
  reservationId: string,
  action: ReservationActionType,
  tokenHash: string,
): Promise<ReservationActionToken> {
  const result = await client.query<TokenRow>(
    `INSERT INTO reservation_action_tokens (reservation_id, action, token_hash)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [reservationId, action, tokenHash],
  );
  return mapRow(result.rows[0]!);
}

/** Locks the token row so a concurrent confirm/reject on the same token cannot both succeed. */
export async function findActionTokenByHashForUpdate(
  client: DbClient,
  tokenHash: string,
): Promise<ReservationActionToken | null> {
  const result = await client.query<TokenRow>(
    'SELECT * FROM reservation_action_tokens WHERE token_hash = $1 FOR UPDATE',
    [tokenHash],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findActionTokenByHash(
  client: DbClient,
  tokenHash: string,
): Promise<ReservationActionToken | null> {
  const result = await client.query<TokenRow>(
    'SELECT * FROM reservation_action_tokens WHERE token_hash = $1',
    [tokenHash],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function markActionTokenUsed(client: DbClient, id: string): Promise<void> {
  await client.query('UPDATE reservation_action_tokens SET used_at = now() WHERE id = $1', [id]);
}

/** Revokes every still-usable token for a reservation (both CONFIRM and REJECT). */
export async function revokeActionTokensForReservation(
  client: DbClient,
  reservationId: string,
): Promise<void> {
  await client.query(
    `UPDATE reservation_action_tokens
     SET revoked_at = now()
     WHERE reservation_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [reservationId],
  );
}
