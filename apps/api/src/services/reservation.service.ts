import type { Pool } from 'pg';
import { DateTime } from 'luxon';
import type { CreateReservationInput } from '@sternen/shared';
import { RESERVATION_STATUS_LABELS_DE } from '@sternen/shared';
import type { AppConfig } from '../config/index.js';
import { RESTAURANT_PROFILE } from '../config/restaurant-profile.js';
import type { DbClient } from '../db/client.js';
import { acquireAreaLock, withTransaction } from '../db/transaction.js';
import {
  AvailabilityConflictError,
  NotFoundError,
  ReservationStateConflictError,
} from '../errors/app-error.js';
import type { NotificationProvider } from '../providers/email/notification-provider.js';
import * as exclusiveAllocationsRepo from '../repositories/exclusive-allocations.repository.js';
import * as reservationsRepo from '../repositories/reservations.repository.js';
import * as statusHistoryRepo from '../repositories/reservation-status-history.repository.js';
import * as areasRepo from '../repositories/areas.repository.js';
import {
  assertAreaAvailableForBooking,
  computeAreaAvailableCapacity,
  computeAvailabilitySnapshot,
  resolveStartInstant,
  toAvailabilityResponseDto,
} from './availability.service.js';
import {
  enqueueGuestReservationCancelled,
  enqueueGuestReservationConfirmed,
  enqueueGuestReservationRejected,
  enqueueGuestRequestReceived,
  enqueueRestaurantNewReservation,
  processOutboxOnce,
} from './notifications.service.js';
import { issueActionTokenPair, revokeReservationActionTokens } from './action-tokens.service.js';
import type { Area, Reservation } from '../types/domain.js';
import { generatePublicReference } from '../utils/crypto.js';
import { instantToLocalDate, instantToLocalDateTimeLabel, instantToLocalTime } from '../utils/time.js';
import type { ReservationSummaryFields } from '../providers/email/templates/types.js';
import type { AppLogger } from '../utils/logger.js';
import { evaluateStatusTransition } from '../utils/status-transitions.js';

const MAX_REFERENCE_ATTEMPTS = 5;
const IMMEDIATE_OUTBOX_PROCESS_LIMIT = 5;
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  );
}

function toSummaryFields(
  config: AppConfig,
  reservation: Reservation,
  areaName: string,
  requestedAreaName: string | null,
): ReservationSummaryFields {
  const zone = config.businessTimeZone;
  const startInstant = DateTime.fromJSDate(reservation.startsAt).toUTC();
  const endInstant = DateTime.fromJSDate(reservation.endsAt).toUTC();
  return {
    publicReference: reservation.publicReference,
    statusLabel: RESERVATION_STATUS_LABELS_DE[reservation.status],
    guestFirstName: reservation.guestFirstName,
    guestLastName: reservation.guestLastName,
    guestEmail: reservation.guestEmail,
    guestPhone: reservation.guestPhone,
    localDateLabel: instantToLocalDate(zone, startInstant),
    startTimeLabel: instantToLocalTime(zone, startInstant),
    endTimeLabel: instantToLocalTime(zone, endInstant),
    partySize: reservation.partySize,
    areaName,
    requestedAreaName,
    guestNotes: reservation.guestNotes,
  };
}

function triggerImmediateOutboxProcessing(
  pool: Pool,
  provider: NotificationProvider,
  logger: AppLogger,
): void {
  // Fire-and-forget: a slow or unreachable SMTP server must never fail the
  // HTTP request that created the reservation. The standalone outbox worker
  // will retry with backoff regardless of whether this succeeds.
  processOutboxOnce(pool, provider, IMMEDIATE_OUTBOX_PROCESS_LIMIT).catch((error: unknown) => {
    logger.error({ err: error }, 'Sofortige Outbox-Verarbeitung fehlgeschlagen, Worker übernimmt.');
  });
}

async function insertReservationWithUniqueReference(
  client: DbClient,
  buildData: (reference: string) => reservationsRepo.CreateReservationData,
): Promise<Reservation> {
  const year = new Date().getUTCFullYear();
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    const reference = generatePublicReference(year);
    try {
      return await reservationsRepo.insertReservation(client, buildData(reference));
    } catch (error) {
      if (isUniqueViolation(error) && attempt < MAX_REFERENCE_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Konnte keine eindeutige Reservationsreferenz erzeugen.');
}

export interface CreateReservationResult {
  reservation: Reservation;
  area: Area;
  requestedAreaName: string | null;
}

/**
 * Resolves which area to attempt, using a read-only snapshot for a fast,
 * user-friendly error when nothing fits at all. The authoritative check that
 * actually prevents double-booking happens later, inside the transaction,
 * after the per-area advisory lock is held (see `assertAreaAvailableForBooking`).
 */
async function resolveTargetAreaId(
  pool: Pool,
  config: AppConfig,
  input: CreateReservationInput,
): Promise<{ areaId: string; startInstant: DateTime }> {
  const startInstant = resolveStartInstant(config.businessTimeZone, input.localDate, input.localTime);

  if (input.preferredAreaId) {
    try {
      await assertAreaAvailableForBooking(
        pool,
        config,
        input.preferredAreaId,
        startInstant,
        input.partySize,
      );
      return { areaId: input.preferredAreaId, startInstant };
    } catch (error) {
      if (error instanceof AvailabilityConflictError) {
        const snapshot = await computeAvailabilitySnapshot(pool, config, {
          localDate: input.localDate,
          localTime: input.localTime,
          partySize: input.partySize,
        });
        throw new AvailabilityConflictError(error.message, {
          alternatives: toAvailabilityResponseDto(snapshot).alternatives,
        });
      }
      throw error;
    }
  }

  const snapshot = await computeAvailabilitySnapshot(pool, config, {
    localDate: input.localDate,
    localTime: input.localTime,
    partySize: input.partySize,
  });
  if (!snapshot.recommendation) {
    throw new AvailabilityConflictError(
      'Für die gewünschte Zeit ist aktuell keine Kapazität verfügbar.',
      { alternatives: [] },
    );
  }
  return { areaId: snapshot.recommendation.area.id, startInstant };
}

export async function createReservation(
  pool: Pool,
  config: AppConfig,
  provider: NotificationProvider,
  logger: AppLogger,
  input: CreateReservationInput,
): Promise<CreateReservationResult> {
  const { areaId: targetAreaId, startInstant } = await resolveTargetAreaId(pool, config, input);

  const result = await withTransaction(pool, async (client) => {
    await acquireAreaLock(client, targetAreaId);

    let area: Area;
    let endsAt: Date;
    try {
      const outcome = await assertAreaAvailableForBooking(
        client,
        config,
        targetAreaId,
        startInstant,
        input.partySize,
      );
      area = outcome.area;
      endsAt = outcome.endsAt;
    } catch (error) {
      if (error instanceof AvailabilityConflictError) {
        const snapshot = await computeAvailabilitySnapshot(client, config, {
          localDate: input.localDate,
          localTime: input.localTime,
          partySize: input.partySize,
        });
        throw new AvailabilityConflictError(error.message, {
          alternatives: toAvailabilityResponseDto(snapshot).alternatives,
        });
      }
      throw error;
    }

    const requestedArea = input.preferredAreaId
      ? await areasRepo.findAreaById(client, input.preferredAreaId)
      : null;

    const reservation = await insertReservationWithUniqueReference(client, (reference) => ({
      publicReference: reference,
      areaId: area.id,
      status: 'PENDING',
      source: 'ONLINE',
      guestFirstName: input.guestFirstName,
      guestLastName: input.guestLastName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      partySize: input.partySize,
      guestNotes: input.guestNotes ?? null,
      requestedAreaId: input.preferredAreaId ?? null,
      areaWasAutoAssigned: !input.preferredAreaId,
      startsAt: startInstant.toJSDate(),
      endsAt,
      consentPrivacyAt: new Date(),
    }));

    if (area.resourceMode === 'EXCLUSIVE') {
      await exclusiveAllocationsRepo.insertExclusiveAllocation(
        client,
        reservation.id,
        area.id,
        reservation.startsAt,
        reservation.endsAt,
      );
    }

    await statusHistoryRepo.insertStatusHistory(
      client,
      reservation.id,
      null,
      'PENDING',
      'SYSTEM',
      'ONLINE_RESERVATION_CREATED',
    );

    const summary = toSummaryFields(config, reservation, area.name, requestedArea?.name ?? null);

    await enqueueRestaurantNewReservation(client, reservation.id, config.email.restaurantNotificationEmail, {
      ...summary,
      receivedAtLabel: instantToLocalDateTimeLabel(config.businessTimeZone, DateTime.utc()),
      confirmUrl: '',
      rejectUrl: '',
    });
    await enqueueGuestRequestReceived(client, reservation.id, reservation.guestEmail, summary);

    // Action tokens are minted *after* the outbox rows above are written, but
    // still inside the same transaction: if anything from here on fails, the
    // whole reservation (and its notifications) rolls back together.
    const tokens = await issueActionTokenPair(client, config, reservation.id);
    await patchRestaurantEmailActionLinks(client, reservation.id, tokens.confirmUrl, tokens.rejectUrl);

    return { reservation, area, requestedAreaName: requestedArea?.name ?? null };
  });

  triggerImmediateOutboxProcessing(pool, provider, logger);

  return result;
}

/**
 * The confirm/reject action links depend on tokens that are only minted after
 * the RESTAURANT_NEW_RESERVATION outbox row is created (tokens reference the
 * reservation, not the other way round). Rather than reordering the whole
 * flow around a chicken-and-egg dependency, the outbox row is patched with
 * the final URLs in the same transaction, before it ever becomes visible to
 * the outbox worker.
 */
async function patchRestaurantEmailActionLinks(
  client: DbClient,
  reservationId: string,
  confirmUrl: string,
  rejectUrl: string,
): Promise<void> {
  await client.query(
    `UPDATE notification_outbox
     SET template_data = template_data || jsonb_build_object('confirmUrl', $2::text, 'rejectUrl', $3::text)
     WHERE reservation_id = $1 AND notification_type = 'RESTAURANT_NEW_RESERVATION'`,
    [reservationId, confirmUrl, rejectUrl],
  );
}

export type ReservationActor =
  | { type: 'ADMIN'; reference: string }
  | { type: 'EMAIL_ACTION'; reference: string }
  | { type: 'POS_API'; reference: string }
  | { type: 'SYSTEM'; reference: string };

/**
 * Core status-transition logic shared by the admin confirm endpoint and the
 * email-action confirm flow. Callers are responsible for locking whatever
 * else they need (e.g. an action token row) within the same transaction;
 * this function always locks the reservation row itself.
 */
export async function confirmReservationTx(
  client: DbClient,
  config: AppConfig,
  reservationId: string,
  actor: ReservationActor,
): Promise<{ reservation: Reservation; area: Area; alreadyConfirmed: boolean }> {
  const reservation = await reservationsRepo.findReservationByIdForUpdate(client, reservationId);
  if (!reservation) {
    throw new NotFoundError('Reservation nicht gefunden.');
  }

  const area = await areasRepo.findAreaById(client, reservation.areaId);
  if (!area) {
    throw new NotFoundError('Bereich der Reservation nicht gefunden.');
  }

  const transition = evaluateStatusTransition(reservation.status, 'CONFIRMED');
  if (transition === 'ALREADY_IN_TARGET_STATE') {
    return { reservation, area, alreadyConfirmed: true };
  }
  if (transition === 'CONFLICT') {
    throw new ReservationStateConflictError(
      `Die Reservation hat den Status "${RESERVATION_STATUS_LABELS_DE[reservation.status]}" und kann nicht bestätigt werden.`,
    );
  }

  if (area.resourceMode === 'CAPACITY') {
    const availableExcludingSelf = await computeAreaAvailableCapacity(
      client,
      area,
      reservation.startsAt,
      reservation.endsAt,
      reservation.id,
    );
    if (availableExcludingSelf < reservation.partySize) {
      throw new AvailabilityConflictError(
        'Die Kapazität reicht für diese Reservation nicht mehr aus. Bitte zuerst Konflikte prüfen.',
      );
    }
  }
  // EXCLUSIVE areas need no re-check: the exclusion constraint on
  // exclusive_reservation_allocations guarantees no conflicting blocking
  // allocation can exist for as long as this reservation's own row is
  // blocking, so the invariant already holds.

  const updated = await reservationsRepo.updateReservationStatus(client, reservationId, {
    status: 'CONFIRMED',
    confirmedAt: new Date(),
  });
  await statusHistoryRepo.insertStatusHistory(
    client,
    reservationId,
    'PENDING',
    'CONFIRMED',
    actor.type,
    actor.reference,
  );
  await revokeReservationActionTokens(client, reservationId);

  const summary = toSummaryFields(config, updated, area.name, null);
  await enqueueGuestReservationConfirmed(client, reservationId, updated.guestEmail, {
    ...summary,
    restaurantAddress: RESTAURANT_PROFILE.address,
    restaurantPhone: RESTAURANT_PROFILE.phone,
  });

  return { reservation: updated, area, alreadyConfirmed: false };
}

export async function rejectReservationTx(
  client: DbClient,
  config: AppConfig,
  reservationId: string,
  actor: ReservationActor,
  reason: string | null,
): Promise<{ reservation: Reservation; alreadyRejected: boolean }> {
  const reservation = await reservationsRepo.findReservationByIdForUpdate(client, reservationId);
  if (!reservation) {
    throw new NotFoundError('Reservation nicht gefunden.');
  }
  const transition = evaluateStatusTransition(reservation.status, 'REJECTED');
  if (transition === 'ALREADY_IN_TARGET_STATE') {
    return { reservation, alreadyRejected: true };
  }
  if (transition === 'CONFLICT') {
    throw new ReservationStateConflictError(
      `Die Reservation hat den Status "${RESERVATION_STATUS_LABELS_DE[reservation.status]}" und kann nicht abgelehnt werden.`,
    );
  }

  const area = await areasRepo.findAreaById(client, reservation.areaId);

  const updated = await reservationsRepo.updateReservationStatus(client, reservationId, {
    status: 'REJECTED',
    rejectedAt: new Date(),
  });
  await statusHistoryRepo.insertStatusHistory(
    client,
    reservationId,
    'PENDING',
    'REJECTED',
    actor.type,
    actor.reference,
  );

  if (area?.resourceMode === 'EXCLUSIVE') {
    await exclusiveAllocationsRepo.releaseExclusiveAllocation(client, reservationId);
  }
  await revokeReservationActionTokens(client, reservationId);

  const summary = toSummaryFields(config, updated, area?.name ?? '', null);
  await enqueueGuestReservationRejected(client, reservationId, updated.guestEmail, {
    ...summary,
    rejectionReason: reason,
  });

  return { reservation: updated, alreadyRejected: false };
}

export async function cancelReservationTx(
  client: DbClient,
  config: AppConfig,
  reservationId: string,
  actor: ReservationActor,
): Promise<{ reservation: Reservation; alreadyCancelled: boolean }> {
  const reservation = await reservationsRepo.findReservationByIdForUpdate(client, reservationId);
  if (!reservation) {
    throw new NotFoundError('Reservation nicht gefunden.');
  }
  const transition = evaluateStatusTransition(reservation.status, 'CANCELLED');
  if (transition === 'ALREADY_IN_TARGET_STATE') {
    return { reservation, alreadyCancelled: true };
  }
  if (transition === 'CONFLICT') {
    throw new ReservationStateConflictError('Eine abgelehnte Reservation kann nicht storniert werden.');
  }

  const previousStatus = reservation.status;
  const area = await areasRepo.findAreaById(client, reservation.areaId);

  const updated = await reservationsRepo.updateReservationStatus(client, reservationId, {
    status: 'CANCELLED',
    cancelledAt: new Date(),
  });
  await statusHistoryRepo.insertStatusHistory(
    client,
    reservationId,
    previousStatus,
    'CANCELLED',
    actor.type,
    actor.reference,
  );

  if (area?.resourceMode === 'EXCLUSIVE') {
    await exclusiveAllocationsRepo.releaseExclusiveAllocation(client, reservationId);
  }
  await revokeReservationActionTokens(client, reservationId);

  const summary = toSummaryFields(config, updated, area?.name ?? '', null);
  await enqueueGuestReservationCancelled(client, reservationId, updated.guestEmail, summary);

  return { reservation: updated, alreadyCancelled: false };
}

export async function confirmReservation(
  pool: Pool,
  config: AppConfig,
  provider: NotificationProvider,
  logger: AppLogger,
  reservationId: string,
  actor: ReservationActor,
): Promise<Reservation> {
  const result = await withTransaction(pool, (client) =>
    confirmReservationTx(client, config, reservationId, actor),
  );
  triggerImmediateOutboxProcessing(pool, provider, logger);
  return result.reservation;
}

export async function rejectReservation(
  pool: Pool,
  config: AppConfig,
  provider: NotificationProvider,
  logger: AppLogger,
  reservationId: string,
  actor: ReservationActor,
  reason: string | null,
): Promise<Reservation> {
  const result = await withTransaction(pool, (client) =>
    rejectReservationTx(client, config, reservationId, actor, reason),
  );
  triggerImmediateOutboxProcessing(pool, provider, logger);
  return result.reservation;
}

export async function cancelReservation(
  pool: Pool,
  config: AppConfig,
  provider: NotificationProvider,
  logger: AppLogger,
  reservationId: string,
  actor: ReservationActor,
): Promise<Reservation> {
  const result = await withTransaction(pool, (client) =>
    cancelReservationTx(client, config, reservationId, actor),
  );
  triggerImmediateOutboxProcessing(pool, provider, logger);
  return result.reservation;
}
