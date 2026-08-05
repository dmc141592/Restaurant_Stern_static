import type { FastifyReply, FastifyRequest } from 'fastify';
import type {
  AreaDto,
  AvailabilityQueryInput,
  CreateReservationInput,
  EventDto,
} from '@sternen/shared';
import { RESERVATION_STATUS_LABELS_DE } from '@sternen/shared';
import { ValidationError } from '../errors/app-error.js';
import * as areasService from '../services/areas.service.js';
import { computeAvailabilitySnapshot, toAvailabilityResponseDto } from '../services/availability.service.js';
import * as eventsService from '../services/events.service.js';
import { createReservation } from '../services/reservation.service.js';
import type { Area } from '../types/domain.js';
import { findValidIdempotencyRecord, insertIdempotencyRecord } from '../repositories/idempotency.repository.js';
import { createHash } from 'node:crypto';

const IDEMPOTENCY_TTL_MINUTES = 30;

function toAreaDto(area: Area): AreaDto {
  return {
    id: area.id,
    slug: area.slug,
    name: area.name,
    description: area.description,
    resourceMode: area.resourceMode,
    capacity: area.capacity,
    defaultDurationMinutes: area.defaultDurationMinutes,
    slotIntervalMinutes: area.slotIntervalMinutes,
    isActive: area.isActive,
    isOnlineBookable: area.isOnlineBookable,
    sortOrder: area.sortOrder,
  };
}

export async function listAreas(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const areas = await areasService.listPublicAreas(request.server.pool);
  reply.send(areas.map(toAreaDto));
}

export async function getAvailability(
  input: AvailabilityQueryInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const snapshot = await computeAvailabilitySnapshot(request.server.pool, request.server.config, {
    localDate: input.date,
    localTime: input.time,
    partySize: input.partySize,
    preferredAreaId: input.preferredAreaId,
  });
  reply.send(toAvailabilityResponseDto(snapshot));
}

function fingerprintFor(input: CreateReservationInput): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        guestEmail: input.guestEmail.toLowerCase(),
        localDate: input.localDate,
        localTime: input.localTime,
        partySize: input.partySize,
        preferredAreaId: input.preferredAreaId ?? null,
      }),
    )
    .digest('hex');
}

export async function createReservationHandler(
  input: CreateReservationInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const idempotencyKey = request.headers['idempotency-key'];
  const key = typeof idempotencyKey === 'string' && idempotencyKey.length > 0 ? idempotencyKey : undefined;
  const fingerprint = fingerprintFor(input);

  if (key) {
    const existing = await findValidIdempotencyRecord(request.server.pool, key);
    if (existing) {
      if (existing.requestFingerprint !== fingerprint) {
        throw new ValidationError(
          'Dieser Idempotency-Key wurde bereits mit anderen Reservationsdaten verwendet.',
        );
      }
      reply.status(existing.responseStatus).send(existing.responseBody);
      return;
    }
  }

  const result = await createReservation(
    request.server.pool,
    request.server.config,
    request.server.notificationProvider,
    request.log,
    input,
  );

  const responseBody = {
    reservation: {
      reference: result.reservation.publicReference,
      status: result.reservation.status,
      statusLabel: RESERVATION_STATUS_LABELS_DE[result.reservation.status],
      area: { id: result.area.id, name: result.area.name },
      startsAt: result.reservation.startsAt.toISOString(),
      endsAt: result.reservation.endsAt.toISOString(),
      partySize: result.reservation.partySize,
    },
    message: 'Ihre Reservationsanfrage wurde übermittelt und wird vom Restaurant geprüft.',
  };

  if (key) {
    await insertIdempotencyRecord(
      request.server.pool,
      key,
      fingerprint,
      result.reservation.id,
      201,
      responseBody,
      IDEMPOTENCY_TTL_MINUTES,
    );
  }

  reply.status(201).send(responseBody);
}

function toEventDto(event: EventDto): EventDto {
  return event;
}

export async function listPublicEvents(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const events = await eventsService.listPublicEvents(request.server.pool);
  reply.send(events.map(toEventDto));
}

export async function getPublicEventBySlug(
  slug: string,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const event = await eventsService.getPublicEventBySlug(request.server.pool, slug);
  reply.send(event);
}
