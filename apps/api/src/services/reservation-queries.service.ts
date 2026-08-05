import type { Pool } from 'pg';
import type { AdminReservationListQuery, PosReservationListQuery } from '@sternen/shared';
import { RESERVATION_STATUS_LABELS_DE } from '@sternen/shared';
import { NotFoundError, ValidationError } from '../errors/app-error.js';
import {
  decodeReservationCursor,
  findReservationById,
  listReservationsForAdmin,
  listReservationsForPos,
} from '../repositories/reservations.repository.js';
import type { ReservationWithArea } from '../types/domain.js';

function parseCursor(cursor: string | undefined): { createdAt: Date; id: string } | null {
  if (!cursor) {
    return null;
  }
  try {
    return decodeReservationCursor(cursor);
  } catch {
    throw new ValidationError('Ungültiger Cursor.');
  }
}

export interface AdminReservationPage {
  data: ReservationWithArea[];
  nextCursor: string | null;
}

export async function queryReservationsForAdmin(
  pool: Pool,
  query: AdminReservationListQuery,
): Promise<AdminReservationPage> {
  const cursor = parseCursor(query.cursor);
  const result = await listReservationsForAdmin(
    pool,
    {
      status: query.status,
      areaId: query.areaId,
      dateFromInstant: query.dateFrom ? new Date(`${query.dateFrom}T00:00:00Z`) : undefined,
      dateToInstant: query.dateTo ? new Date(`${query.dateTo}T00:00:00Z`) : undefined,
    },
    cursor,
    query.limit,
  );
  return { data: result.rows, nextCursor: result.nextCursor };
}

export async function queryReservationsForPos(
  pool: Pool,
  query: PosReservationListQuery,
): Promise<AdminReservationPage> {
  const cursor = parseCursor(query.cursor);
  const result = await listReservationsForPos(
    pool,
    {
      status: query.status,
      areaId: query.areaId,
      dateFromInstant: query.from ? new Date(query.from) : undefined,
      dateToInstant: query.to ? new Date(query.to) : undefined,
      createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
    },
    cursor,
    query.limit,
  );
  return { data: result.rows, nextCursor: result.nextCursor };
}

export async function getReservationForAdmin(pool: Pool, id: string): Promise<ReservationWithArea> {
  const reservation = await findReservationById(pool, id);
  if (!reservation) {
    throw new NotFoundError('Reservation nicht gefunden.');
  }
  return reservation;
}

export function statusLabel(status: ReservationWithArea['status']): string {
  return RESERVATION_STATUS_LABELS_DE[status];
}
