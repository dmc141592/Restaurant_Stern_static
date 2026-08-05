import type { ReservationSource, ReservationStatus } from '@sternen/shared';
import type { DbClient } from '../db/client.js';
import type { Reservation, ReservationWithArea } from '../types/domain.js';

interface ReservationRow {
  id: string;
  public_reference: string;
  area_id: string;
  status: ReservationStatus;
  source: ReservationSource;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  guest_phone: string;
  party_size: number;
  guest_notes: string | null;
  requested_area_id: string | null;
  area_was_auto_assigned: boolean;
  starts_at: Date;
  ends_at: Date;
  consent_privacy_at: Date;
  confirmed_at: Date | null;
  rejected_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ReservationWithAreaRow extends ReservationRow {
  area_name: string;
  requested_area_name: string | null;
}

function mapRow(row: ReservationRow): Reservation {
  return {
    id: row.id,
    publicReference: row.public_reference,
    areaId: row.area_id,
    status: row.status,
    source: row.source,
    guestFirstName: row.guest_first_name,
    guestLastName: row.guest_last_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    partySize: row.party_size,
    guestNotes: row.guest_notes,
    requestedAreaId: row.requested_area_id,
    areaWasAutoAssigned: row.area_was_auto_assigned,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    consentPrivacyAt: row.consent_privacy_at,
    confirmedAt: row.confirmed_at,
    rejectedAt: row.rejected_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowWithArea(row: ReservationWithAreaRow): ReservationWithArea {
  return {
    ...mapRow(row),
    areaName: row.area_name,
    requestedAreaName: row.requested_area_name,
  };
}

const WITH_AREA_SELECT = `
  SELECT r.*, a.name AS area_name, ra.name AS requested_area_name
  FROM reservations r
  JOIN areas a ON a.id = r.area_id
  LEFT JOIN areas ra ON ra.id = r.requested_area_id
`;

export interface CreateReservationData {
  publicReference: string;
  areaId: string;
  status: ReservationStatus;
  source: ReservationSource;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone: string;
  partySize: number;
  guestNotes: string | null;
  requestedAreaId: string | null;
  areaWasAutoAssigned: boolean;
  startsAt: Date;
  endsAt: Date;
  consentPrivacyAt: Date;
}

export async function insertReservation(
  client: DbClient,
  data: CreateReservationData,
): Promise<Reservation> {
  const result = await client.query<ReservationRow>(
    `INSERT INTO reservations
      (public_reference, area_id, status, source, guest_first_name, guest_last_name,
       guest_email, guest_phone, party_size, guest_notes, requested_area_id,
       area_was_auto_assigned, starts_at, ends_at, consent_privacy_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      data.publicReference,
      data.areaId,
      data.status,
      data.source,
      data.guestFirstName,
      data.guestLastName,
      data.guestEmail,
      data.guestPhone,
      data.partySize,
      data.guestNotes,
      data.requestedAreaId,
      data.areaWasAutoAssigned,
      data.startsAt,
      data.endsAt,
      data.consentPrivacyAt,
    ],
  );
  return mapRow(result.rows[0]!);
}

export async function findReservationById(
  client: DbClient,
  id: string,
): Promise<ReservationWithArea | null> {
  const result = await client.query<ReservationWithAreaRow>(`${WITH_AREA_SELECT} WHERE r.id = $1`, [
    id,
  ]);
  return result.rows[0] ? mapRowWithArea(result.rows[0]) : null;
}

/** Locks the reservation row for the remainder of the transaction to serialise status changes. */
export async function findReservationByIdForUpdate(
  client: DbClient,
  id: string,
): Promise<Reservation | null> {
  const result = await client.query<ReservationRow>(
    'SELECT * FROM reservations WHERE id = $1 FOR UPDATE',
    [id],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findReservationByPublicReference(
  client: DbClient,
  publicReference: string,
): Promise<ReservationWithArea | null> {
  const result = await client.query<ReservationWithAreaRow>(
    `${WITH_AREA_SELECT} WHERE r.public_reference = $1`,
    [publicReference],
  );
  return result.rows[0] ? mapRowWithArea(result.rows[0]) : null;
}

export async function publicReferenceExists(client: DbClient, publicReference: string): Promise<boolean> {
  const result = await client.query('SELECT 1 FROM reservations WHERE public_reference = $1', [
    publicReference,
  ]);
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Sums party sizes of blocking (PENDING/CONFIRMED) reservations in `areaId`
 * that overlap `[startsAt, endsAt)`, optionally excluding one reservation
 * (used when re-checking availability for a reservation that already
 * exists, e.g. during the confirm action).
 */
export async function sumOverlappingBlockingPartySize(
  client: DbClient,
  areaId: string,
  startsAt: Date,
  endsAt: Date,
  excludeReservationId?: string,
): Promise<number> {
  const result = await client.query<{ total: string | null }>(
    `SELECT COALESCE(SUM(party_size), 0) AS total
     FROM reservations
     WHERE area_id = $1
       AND status IN ('PENDING', 'CONFIRMED')
       AND time_range && tstzrange($2, $3, '[)')
       AND ($4::uuid IS NULL OR id != $4)`,
    [areaId, startsAt, endsAt, excludeReservationId ?? null],
  );
  return Number(result.rows[0]?.total ?? 0);
}

interface StatusUpdateFields {
  status: ReservationStatus;
  confirmedAt?: Date;
  rejectedAt?: Date;
  cancelledAt?: Date;
}

export async function updateReservationStatus(
  client: DbClient,
  id: string,
  fields: StatusUpdateFields,
): Promise<Reservation> {
  const result = await client.query<ReservationRow>(
    `UPDATE reservations
     SET status = $2,
         confirmed_at = COALESCE($3, confirmed_at),
         rejected_at = COALESCE($4, rejected_at),
         cancelled_at = COALESCE($5, cancelled_at)
     WHERE id = $1
     RETURNING *`,
    [id, fields.status, fields.confirmedAt ?? null, fields.rejectedAt ?? null, fields.cancelledAt ?? null],
  );
  return mapRow(result.rows[0]!);
}

export interface AdminReservationFilter {
  status?: ReservationStatus;
  areaId?: string;
  dateFromInstant?: Date;
  dateToInstant?: Date;
}

export interface CursorPageResult<T> {
  rows: T[];
  nextCursor: string | null;
}

/**
 * Cursor pagination ordered by (created_at DESC, id DESC). The cursor encodes
 * both fields so pagination stays stable even when multiple reservations
 * share the same created_at timestamp.
 */
export async function listReservationsForAdmin(
  client: DbClient,
  filter: AdminReservationFilter,
  cursor: { createdAt: Date; id: string } | null,
  limit: number,
): Promise<CursorPageResult<ReservationWithArea>> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (filter.status) {
    conditions.push(`r.status = $${index}`);
    values.push(filter.status);
    index += 1;
  }
  if (filter.areaId) {
    conditions.push(`r.area_id = $${index}`);
    values.push(filter.areaId);
    index += 1;
  }
  if (filter.dateFromInstant) {
    conditions.push(`r.starts_at >= $${index}`);
    values.push(filter.dateFromInstant);
    index += 1;
  }
  if (filter.dateToInstant) {
    conditions.push(`r.starts_at < $${index}`);
    values.push(filter.dateToInstant);
    index += 1;
  }
  if (cursor) {
    conditions.push(`(r.created_at, r.id) < ($${index}, $${index + 1})`);
    values.push(cursor.createdAt, cursor.id);
    index += 2;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit + 1);

  const result = await client.query<ReservationWithAreaRow>(
    `${WITH_AREA_SELECT} ${whereClause}
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT $${index}`,
    values,
  );

  const rows = result.rows.map(mapRowWithArea);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeReservationCursor(last.createdAt, last.id) : null;

  return { rows: page, nextCursor };
}

export async function listReservationsForPos(
  client: DbClient,
  filter: AdminReservationFilter & { createdAfter?: Date },
  cursor: { createdAt: Date; id: string } | null,
  limit: number,
): Promise<CursorPageResult<ReservationWithArea>> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (filter.status) {
    conditions.push(`r.status = $${index}`);
    values.push(filter.status);
    index += 1;
  }
  if (filter.areaId) {
    conditions.push(`r.area_id = $${index}`);
    values.push(filter.areaId);
    index += 1;
  }
  if (filter.dateFromInstant) {
    conditions.push(`r.starts_at >= $${index}`);
    values.push(filter.dateFromInstant);
    index += 1;
  }
  if (filter.dateToInstant) {
    conditions.push(`r.starts_at < $${index}`);
    values.push(filter.dateToInstant);
    index += 1;
  }
  if (filter.createdAfter) {
    conditions.push(`r.created_at > $${index}`);
    values.push(filter.createdAfter);
    index += 1;
  }
  if (cursor) {
    conditions.push(`(r.created_at, r.id) < ($${index}, $${index + 1})`);
    values.push(cursor.createdAt, cursor.id);
    index += 2;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit + 1);

  const result = await client.query<ReservationWithAreaRow>(
    `${WITH_AREA_SELECT} ${whereClause}
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT $${index}`,
    values,
  );

  const rows = result.rows.map(mapRowWithArea);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeReservationCursor(last.createdAt, last.id) : null;

  return { rows: page, nextCursor };
}

export function encodeReservationCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id }), 'utf8').toString(
    'base64url',
  );
}

export function decodeReservationCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
      createdAt: string;
      id: string;
    };
    return { createdAt: new Date(decoded.createdAt), id: decoded.id };
  } catch {
    throw new Error('Ungültiger Cursor.');
  }
}

/** Reservations overlapping a candidate block window, for the admin conflict-warning flow. */
export async function findOverlappingBlockingReservations(
  client: DbClient,
  areaId: string | null,
  startsAt: Date,
  endsAt: Date,
): Promise<ReservationWithArea[]> {
  const result = await client.query<ReservationWithAreaRow>(
    `${WITH_AREA_SELECT}
     WHERE r.status IN ('PENDING', 'CONFIRMED')
       AND r.time_range && tstzrange($2, $3, '[)')
       AND ($1::uuid IS NULL OR r.area_id = $1)
     ORDER BY r.starts_at`,
    [areaId, startsAt, endsAt],
  );
  return result.rows.map(mapRowWithArea);
}

/** For the retention job: reservations whose end time is old enough to anonymise. */
export async function findReservationsOlderThan(
  client: DbClient,
  cutoff: Date,
  limit: number,
): Promise<Reservation[]> {
  const result = await client.query<ReservationRow>(
    `SELECT * FROM reservations
     WHERE ends_at < $1 AND guest_email NOT LIKE 'anonymised+%'
     ORDER BY ends_at
     LIMIT $2`,
    [cutoff, limit],
  );
  return result.rows.map(mapRow);
}

export async function anonymiseReservation(client: DbClient, id: string): Promise<void> {
  await client.query(
    `UPDATE reservations
     SET guest_first_name = 'Anonymisiert',
         guest_last_name = 'Anonymisiert',
         guest_email = 'anonymised+' || id || '@invalid.local',
         guest_phone = '+00000000000',
         guest_notes = NULL
     WHERE id = $1`,
    [id],
  );
}
