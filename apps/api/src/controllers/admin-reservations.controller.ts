import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AdminReservationDto,
  PosReservationDto,
  PosReservationListQuery,
  ReservationStatusActionInput,
} from '@sternen/shared';
import { RESERVATION_STATUS_LABELS_DE } from '@sternen/shared';
import { PostgresPosIntegration } from '../integrations/pos/postgres-pos-integration.js';
import { cancelReservation, confirmReservation, rejectReservation } from '../services/reservation.service.js';
import {
  getReservationForAdmin,
  queryReservationsForAdmin,
} from '../services/reservation-queries.service.js';
import type { ReservationWithArea } from '../types/domain.js';

function toAdminDto(reservation: ReservationWithArea): AdminReservationDto {
  return {
    id: reservation.id,
    reference: reservation.publicReference,
    status: reservation.status,
    statusLabel: RESERVATION_STATUS_LABELS_DE[reservation.status],
    source: reservation.source,
    startsAt: reservation.startsAt.toISOString(),
    endsAt: reservation.endsAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
    updatedAt: reservation.updatedAt.toISOString(),
    partySize: reservation.partySize,
    area: { id: reservation.areaId, name: reservation.areaName },
    requestedArea: reservation.requestedAreaId
      ? { id: reservation.requestedAreaId, name: reservation.requestedAreaName ?? '' }
      : null,
    areaWasAutoAssigned: reservation.areaWasAutoAssigned,
    guest: {
      firstName: reservation.guestFirstName,
      lastName: reservation.guestLastName,
      email: reservation.guestEmail,
      phone: reservation.guestPhone,
    },
    notes: reservation.guestNotes,
  };
}

export async function listReservationsHandler(
  query: PosReservationListQuery,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (request.apiKey) {
    const integration = new PostgresPosIntegration(request.server.pool, request.apiKey.id);
    const result = await integration.exportReservations(query);
    reply.send({
      data: result.data.map((row): PosReservationDto => ({ ...row, status: row.status as PosReservationDto['status'] })),
      pagination: { nextCursor: result.nextCursor },
    });
    return;
  }

  const page = await queryReservationsForAdmin(request.server.pool, {
    status: query.status,
    areaId: query.areaId,
    dateFrom: query.from ? query.from.slice(0, 10) : undefined,
    dateTo: query.to ? query.to.slice(0, 10) : undefined,
    cursor: query.cursor,
    limit: query.limit,
  });
  reply.send({ data: page.data.map(toAdminDto), pagination: { nextCursor: page.nextCursor } });
}

export async function getReservationHandler(
  id: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const reservation = await getReservationForAdmin(request.server.pool, id);
  reply.send(toAdminDto(reservation));
}

function actorReference(request: FastifyRequest): string {
  return request.adminSession?.administrator.email ?? 'unknown-admin';
}

export async function confirmReservationHandler(
  id: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const reservation = await confirmReservation(
    request.server.pool,
    request.server.config,
    request.server.notificationProvider,
    request.log,
    id,
    { type: 'ADMIN', reference: actorReference(request) },
  );
  const withArea = await getReservationForAdmin(request.server.pool, reservation.id);
  reply.send(toAdminDto(withArea));
}

export async function rejectReservationHandler(
  id: string,
  input: ReservationStatusActionInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const reservation = await rejectReservation(
    request.server.pool,
    request.server.config,
    request.server.notificationProvider,
    request.log,
    id,
    { type: 'ADMIN', reference: actorReference(request) },
    input.reason ?? null,
  );
  const withArea = await getReservationForAdmin(request.server.pool, reservation.id);
  reply.send(toAdminDto(withArea));
}

export async function cancelReservationHandler(
  id: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const reservation = await cancelReservation(
    request.server.pool,
    request.server.config,
    request.server.notificationProvider,
    request.log,
    id,
    { type: 'ADMIN', reference: actorReference(request) },
  );
  const withArea = await getReservationForAdmin(request.server.pool, reservation.id);
  reply.send(toAdminDto(withArea));
}
