export interface ReservationExportQuery {
  status?: string;
  from?: string;
  to?: string;
  areaId?: string;
  createdAfter?: string;
  cursor?: string;
  limit?: number;
}

export interface ReservationExportRow {
  id: string;
  reference: string;
  status: string;
  startsAt: string;
  endsAt: string;
  partySize: number;
  area: { id: string; name: string };
  guest: { firstName: string; lastName: string; email: string; phone: string };
  notes: string | null;
  updatedAt: string;
}

export interface ReservationExportResult {
  data: ReservationExportRow[];
  nextCursor: string | null;
}

/**
 * Integration seam for a future point-of-sale/kitchen-display system. The
 * first implementation only reads already-persisted Postgres data through
 * the existing repository/service layers and exposes it behind the
 * API-key-protected `/api/v1/admin/reservations` endpoint — it never writes
 * back to `reservations`. A future POS push-integration (e.g. syncing table
 * assignments back) would implement this same interface without requiring
 * changes to the reservation service or controllers.
 */
export interface PosIntegration {
  exportReservations(input: ReservationExportQuery): Promise<ReservationExportResult>;
}
