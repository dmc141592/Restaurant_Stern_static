import type { NotificationType } from '@sternen/shared';
import { RESERVATION_STATUS_LABELS_DE } from '@sternen/shared';
import type { DbClient } from '../db/client.js';
import type { Pool } from 'pg';
import * as outboxRepo from '../repositories/notification-outbox.repository.js';
import type { NotificationProvider } from '../providers/email/notification-provider.js';
import { renderRestaurantNewReservation } from '../providers/email/templates/restaurant-new-reservation.js';
import { renderGuestRequestReceived } from '../providers/email/templates/guest-request-received.js';
import { renderGuestReservationConfirmed } from '../providers/email/templates/guest-reservation-confirmed.js';
import { renderGuestReservationRejected } from '../providers/email/templates/guest-reservation-rejected.js';
import { renderGuestReservationCancelled } from '../providers/email/templates/guest-reservation-cancelled.js';
import type {
  GuestReservationCancelledData,
  GuestReservationConfirmedData,
  GuestReservationRejectedData,
  GuestRequestReceivedData,
  RestaurantNewReservationData,
} from '../providers/email/templates/types.js';
import type { RenderedEmail } from '../providers/email/templates/layout.js';

export async function enqueueRestaurantNewReservation(
  client: DbClient,
  reservationId: string,
  recipientEmail: string,
  data: RestaurantNewReservationData,
): Promise<void> {
  await outboxRepo.enqueueNotification(
    client,
    reservationId,
    'RESTAURANT_NEW_RESERVATION',
    recipientEmail,
    data as unknown as Record<string, unknown>,
  );
}

export async function enqueueGuestRequestReceived(
  client: DbClient,
  reservationId: string,
  recipientEmail: string,
  data: GuestRequestReceivedData,
): Promise<void> {
  await outboxRepo.enqueueNotification(
    client,
    reservationId,
    'GUEST_REQUEST_RECEIVED',
    recipientEmail,
    data as unknown as Record<string, unknown>,
  );
}

export async function enqueueGuestReservationConfirmed(
  client: DbClient,
  reservationId: string,
  recipientEmail: string,
  data: GuestReservationConfirmedData,
): Promise<void> {
  await outboxRepo.enqueueNotification(
    client,
    reservationId,
    'GUEST_RESERVATION_CONFIRMED',
    recipientEmail,
    data as unknown as Record<string, unknown>,
  );
}

export async function enqueueGuestReservationRejected(
  client: DbClient,
  reservationId: string,
  recipientEmail: string,
  data: GuestReservationRejectedData,
): Promise<void> {
  await outboxRepo.enqueueNotification(
    client,
    reservationId,
    'GUEST_RESERVATION_REJECTED',
    recipientEmail,
    data as unknown as Record<string, unknown>,
  );
}

export async function enqueueGuestReservationCancelled(
  client: DbClient,
  reservationId: string,
  recipientEmail: string,
  data: GuestReservationCancelledData,
): Promise<void> {
  await outboxRepo.enqueueNotification(
    client,
    reservationId,
    'GUEST_RESERVATION_CANCELLED',
    recipientEmail,
    data as unknown as Record<string, unknown>,
  );
}

function renderByType(type: NotificationType, templateData: Record<string, unknown>): RenderedEmail {
  switch (type) {
    case 'RESTAURANT_NEW_RESERVATION':
      return renderRestaurantNewReservation(templateData as unknown as RestaurantNewReservationData);
    case 'GUEST_REQUEST_RECEIVED':
      return renderGuestRequestReceived(templateData as unknown as GuestRequestReceivedData);
    case 'GUEST_RESERVATION_CONFIRMED':
      return renderGuestReservationConfirmed(
        templateData as unknown as GuestReservationConfirmedData,
      );
    case 'GUEST_RESERVATION_REJECTED':
      return renderGuestReservationRejected(templateData as unknown as GuestReservationRejectedData);
    case 'GUEST_RESERVATION_CANCELLED':
      return renderGuestReservationCancelled(
        templateData as unknown as GuestReservationCancelledData,
      );
  }
}

export interface OutboxProcessResult {
  claimed: number;
  sent: number;
  failed: number;
}

/**
 * Claims and processes up to `limit` due outbox entries. Safe to call
 * concurrently (claiming uses `FOR UPDATE SKIP LOCKED`) and safe to call
 * opportunistically right after enqueueing (best-effort immediate delivery)
 * as well as from the standalone worker loop.
 */
export async function processOutboxOnce(
  pool: Pool,
  provider: NotificationProvider,
  limit: number,
): Promise<OutboxProcessResult> {
  const claimed = await outboxRepo.claimDueNotifications(pool, limit);
  let sent = 0;
  let failed = 0;

  for (const item of claimed) {
    try {
      const rendered = renderByType(item.notificationType, item.templateData);
      const result = await provider.send({
        to: item.recipientEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      if (result.success) {
        await outboxRepo.markNotificationSent(pool, item.id);
        sent += 1;
      } else {
        await outboxRepo.markNotificationFailedAndReschedule(
          pool,
          item.id,
          item.attempts,
          result.errorMessage ?? 'Unbekannter Fehler beim Versand.',
        );
        failed += 1;
      }
    } catch (error) {
      await outboxRepo.markNotificationFailedAndReschedule(
        pool,
        item.id,
        item.attempts,
        error instanceof Error ? error.message : 'Unbekannter Fehler bei der Verarbeitung.',
      );
      failed += 1;
    }
  }

  return { claimed: claimed.length, sent, failed };
}

export async function resetStaleOutboxEntries(pool: Pool, staleAfterMinutes = 10): Promise<number> {
  return outboxRepo.resetStaleProcessingNotifications(pool, staleAfterMinutes);
}

export function reservationStatusLabel(status: keyof typeof RESERVATION_STATUS_LABELS_DE): string {
  return RESERVATION_STATUS_LABELS_DE[status];
}
