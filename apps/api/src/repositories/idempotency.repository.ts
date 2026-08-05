import type { DbClient } from '../db/client.js';

export interface IdempotencyRecord {
  idempotencyKey: string;
  requestFingerprint: string;
  reservationId: string | null;
  responseStatus: number;
  responseBody: unknown;
  expiresAt: Date;
}

interface IdempotencyRow {
  idempotency_key: string;
  request_fingerprint: string;
  reservation_id: string | null;
  response_status: number;
  response_body: unknown;
  expires_at: Date;
}

function mapRow(row: IdempotencyRow): IdempotencyRecord {
  return {
    idempotencyKey: row.idempotency_key,
    requestFingerprint: row.request_fingerprint,
    reservationId: row.reservation_id,
    responseStatus: row.response_status,
    responseBody: row.response_body,
    expiresAt: row.expires_at,
  };
}

export async function findValidIdempotencyRecord(
  client: DbClient,
  key: string,
): Promise<IdempotencyRecord | null> {
  const result = await client.query<IdempotencyRow>(
    `SELECT * FROM idempotency_keys WHERE idempotency_key = $1 AND expires_at > now()`,
    [key],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function insertIdempotencyRecord(
  client: DbClient,
  key: string,
  requestFingerprint: string,
  reservationId: string | null,
  responseStatus: number,
  responseBody: unknown,
  ttlMinutes: number,
): Promise<void> {
  await client.query(
    `INSERT INTO idempotency_keys
      (idempotency_key, request_fingerprint, reservation_id, response_status, response_body, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' minutes')::interval)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [key, requestFingerprint, reservationId, responseStatus, JSON.stringify(responseBody), ttlMinutes],
  );
}

export async function deleteExpiredIdempotencyRecords(client: DbClient): Promise<number> {
  const result = await client.query('DELETE FROM idempotency_keys WHERE expires_at < now()');
  return result.rowCount ?? 0;
}
