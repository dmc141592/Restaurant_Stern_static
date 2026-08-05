import type { NotificationStatusValue, NotificationType } from '@sternen/shared';
import type { DbClient } from '../db/client.js';
import type { NotificationOutboxItem } from '../types/domain.js';

interface OutboxRow {
  id: string;
  reservation_id: string | null;
  notification_type: NotificationType;
  recipient_email: string;
  template_data: Record<string, unknown>;
  status: NotificationStatusValue;
  attempts: number;
  next_attempt_at: Date;
  locked_at: Date | null;
  sent_at: Date | null;
  last_error: string | null;
  created_at: Date;
}

function mapRow(row: OutboxRow): NotificationOutboxItem {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    notificationType: row.notification_type,
    recipientEmail: row.recipient_email,
    templateData: row.template_data,
    status: row.status,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lockedAt: row.locked_at,
    sentAt: row.sent_at,
    lastError: row.last_error,
    createdAt: row.created_at,
  };
}

export async function enqueueNotification(
  client: DbClient,
  reservationId: string | null,
  notificationType: NotificationType,
  recipientEmail: string,
  templateData: Record<string, unknown>,
): Promise<NotificationOutboxItem> {
  const result = await client.query<OutboxRow>(
    `INSERT INTO notification_outbox (reservation_id, notification_type, recipient_email, template_data)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [reservationId, notificationType, recipientEmail, JSON.stringify(templateData)],
  );
  return mapRow(result.rows[0]!);
}

/**
 * Claims up to `limit` due notifications using `FOR UPDATE SKIP LOCKED`, so
 * multiple worker instances (or a manual trigger racing the background loop)
 * never process the same row twice.
 */
export async function claimDueNotifications(
  client: DbClient,
  limit: number,
): Promise<NotificationOutboxItem[]> {
  const result = await client.query<OutboxRow>(
    `UPDATE notification_outbox
     SET status = 'PROCESSING', locked_at = now()
     WHERE id IN (
       SELECT id FROM notification_outbox
       WHERE status = 'PENDING' AND next_attempt_at <= now()
       ORDER BY next_attempt_at
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [limit],
  );
  return result.rows.map(mapRow);
}

export async function markNotificationSent(client: DbClient, id: string): Promise<void> {
  await client.query(
    `UPDATE notification_outbox SET status = 'SENT', sent_at = now(), locked_at = NULL WHERE id = $1`,
    [id],
  );
}

const MAX_ATTEMPTS = 8;

/** Exponential backoff capped at 1 hour; gives up (status FAILED) after MAX_ATTEMPTS. */
export async function markNotificationFailedAndReschedule(
  client: DbClient,
  id: string,
  attempts: number,
  errorMessage: string,
): Promise<void> {
  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    await client.query(
      `UPDATE notification_outbox
       SET status = 'FAILED', attempts = $2, last_error = $3, locked_at = NULL
       WHERE id = $1`,
      [id, nextAttempts, errorMessage],
    );
    return;
  }

  const backoffSeconds = Math.min(2 ** nextAttempts * 30, 3600);
  await client.query(
    `UPDATE notification_outbox
     SET status = 'PENDING', attempts = $2, last_error = $3, locked_at = NULL,
         next_attempt_at = now() + ($4 || ' seconds')::interval
     WHERE id = $1`,
    [id, nextAttempts, errorMessage, backoffSeconds],
  );
}

/** Resets outbox rows stuck in PROCESSING beyond a stale threshold (e.g. worker crashed mid-send). */
export async function resetStaleProcessingNotifications(
  client: DbClient,
  staleAfterMinutes: number,
): Promise<number> {
  const result = await client.query(
    `UPDATE notification_outbox
     SET status = 'PENDING', locked_at = NULL
     WHERE status = 'PROCESSING' AND locked_at < now() - ($1 || ' minutes')::interval`,
    [staleAfterMinutes],
  );
  return result.rowCount ?? 0;
}

export async function findOutboxItemById(
  client: DbClient,
  id: string,
): Promise<NotificationOutboxItem | null> {
  const result = await client.query<OutboxRow>('SELECT * FROM notification_outbox WHERE id = $1', [
    id,
  ]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}
