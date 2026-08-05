import type { Pool } from 'pg';
import type { PosReservationListQuery } from '@sternen/shared';
import { queryReservationsForPos } from '../../services/reservation-queries.service.js';
import { recordPosExport } from '../../repositories/api-keys.repository.js';
import type { PosIntegration, ReservationExportQuery, ReservationExportResult } from './pos-integration.js';

export class PostgresPosIntegration implements PosIntegration {
  constructor(
    private readonly pool: Pool,
    private readonly apiKeyId: string,
  ) {}

  async exportReservations(input: ReservationExportQuery): Promise<ReservationExportResult> {
    const query: PosReservationListQuery = {
      status: input.status as PosReservationListQuery['status'],
      from: input.from,
      to: input.to,
      areaId: input.areaId,
      createdAfter: input.createdAfter,
      cursor: input.cursor,
      limit: input.limit ?? 50,
    };

    const page = await queryReservationsForPos(this.pool, query);

    for (const reservation of page.data) {
      await recordPosExport(this.pool, reservation.id, this.apiKeyId);
    }

    return {
      data: page.data.map((reservation) => ({
        id: reservation.id,
        reference: reservation.publicReference,
        status: reservation.status,
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
        partySize: reservation.partySize,
        area: { id: reservation.areaId, name: reservation.areaName },
        guest: {
          firstName: reservation.guestFirstName,
          lastName: reservation.guestLastName,
          email: reservation.guestEmail,
          phone: reservation.guestPhone,
        },
        notes: reservation.guestNotes,
        updatedAt: reservation.updatedAt.toISOString(),
      })),
      nextCursor: page.nextCursor,
    };
  }
}
