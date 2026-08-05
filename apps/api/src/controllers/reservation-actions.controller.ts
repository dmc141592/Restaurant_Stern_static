import type { FastifyReply, FastifyRequest } from 'fastify';
import { RESERVATION_STATUS_LABELS_DE } from '@sternen/shared';
import type { ReservationWithArea } from '../types/domain.js';
import {
  confirmViaToken,
  previewReservationAction,
  rejectViaToken,
} from '../services/reservation-actions.service.js';

function toPreviewDto(reservation: ReservationWithArea) {
  return {
    reference: reservation.publicReference,
    status: reservation.status,
    statusLabel: RESERVATION_STATUS_LABELS_DE[reservation.status],
    guestFirstName: reservation.guestFirstName,
    guestLastName: reservation.guestLastName,
    guestEmail: reservation.guestEmail,
    guestPhone: reservation.guestPhone,
    partySize: reservation.partySize,
    areaName: reservation.areaName,
    startsAt: reservation.startsAt.toISOString(),
    endsAt: reservation.endsAt.toISOString(),
    notes: reservation.guestNotes,
  };
}

export async function previewAction(
  token: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const preview = await previewReservationAction(request.server.pool, request.server.config, token);
  reply.send({
    action: preview.action,
    alreadyUsed: preview.alreadyUsed,
    isRevoked: preview.isRevoked,
    reservation: toPreviewDto(preview.reservation),
  });
}

export async function confirmAction(
  token: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await confirmViaToken(
    request.server.pool,
    request.server.config,
    request.server.notificationProvider,
    request.log,
    token,
  );
  reply.send({ alreadyProcessed: result.alreadyProcessed, reservation: toPreviewDto(result.reservation) });
}

export async function rejectAction(
  token: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await rejectViaToken(
    request.server.pool,
    request.server.config,
    request.server.notificationProvider,
    request.log,
    token,
  );
  reply.send({ alreadyProcessed: result.alreadyProcessed, reservation: toPreviewDto(result.reservation) });
}
