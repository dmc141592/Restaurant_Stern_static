import type { Pool } from 'pg';
import type { AppConfig } from '../config/index.js';
import { withTransaction } from '../db/transaction.js';
import { InvalidActionTokenError } from '../errors/app-error.js';
import type { NotificationProvider } from '../providers/email/notification-provider.js';
import * as reservationsRepo from '../repositories/reservations.repository.js';
import type { ReservationWithArea } from '../types/domain.js';
import type { AppLogger } from '../utils/logger.js';
import { findTokenByHashForUpdate, markActionTokenUsed } from './action-tokens.service.js';
import { processOutboxOnce } from './notifications.service.js';
import { confirmReservationTx, rejectReservationTx } from './reservation.service.js';

export interface ActionResult {
  reservation: ReservationWithArea;
  alreadyProcessed: boolean;
}

async function triggerOutboxAfterCommit(
  pool: Pool,
  provider: NotificationProvider,
  logger: AppLogger,
): Promise<void> {
  processOutboxOnce(pool, provider, 5).catch((error: unknown) => {
    logger.error({ err: error }, 'Sofortige Outbox-Verarbeitung nach E-Mail-Aktion fehlgeschlagen.');
  });
}

export async function confirmViaToken(
  pool: Pool,
  config: AppConfig,
  provider: NotificationProvider,
  logger: AppLogger,
  tokenPlaintext: string,
): Promise<ActionResult> {
  const result = await withTransaction(pool, async (client) => {
    const token = await findTokenByHashForUpdate(client, config, tokenPlaintext);
    if (!token || token.action !== 'CONFIRM') {
      throw new InvalidActionTokenError();
    }
    if (token.usedAt) {
      const reservation = await reservationsRepo.findReservationById(client, token.reservationId);
      if (!reservation) {
        throw new InvalidActionTokenError();
      }
      return { reservation, alreadyProcessed: true };
    }
    if (token.revokedAt) {
      throw new InvalidActionTokenError('Dieser Link ist nicht mehr gültig.');
    }

    await confirmReservationTx(client, config, token.reservationId, {
      type: 'EMAIL_ACTION',
      reference: 'reservation-action-token',
    });
    await markActionTokenUsed(client, token.id);

    const reservation = await reservationsRepo.findReservationById(client, token.reservationId);
    if (!reservation) {
      throw new InvalidActionTokenError();
    }
    return { reservation, alreadyProcessed: false };
  });

  await triggerOutboxAfterCommit(pool, provider, logger);
  return result;
}

export async function rejectViaToken(
  pool: Pool,
  config: AppConfig,
  provider: NotificationProvider,
  logger: AppLogger,
  tokenPlaintext: string,
): Promise<ActionResult> {
  const result = await withTransaction(pool, async (client) => {
    const token = await findTokenByHashForUpdate(client, config, tokenPlaintext);
    if (!token || token.action !== 'REJECT') {
      throw new InvalidActionTokenError();
    }
    if (token.usedAt) {
      const reservation = await reservationsRepo.findReservationById(client, token.reservationId);
      if (!reservation) {
        throw new InvalidActionTokenError();
      }
      return { reservation, alreadyProcessed: true };
    }
    if (token.revokedAt) {
      throw new InvalidActionTokenError('Dieser Link ist nicht mehr gültig.');
    }

    await rejectReservationTx(
      client,
      config,
      token.reservationId,
      { type: 'EMAIL_ACTION', reference: 'reservation-action-token' },
      null,
    );
    await markActionTokenUsed(client, token.id);

    const reservation = await reservationsRepo.findReservationById(client, token.reservationId);
    if (!reservation) {
      throw new InvalidActionTokenError();
    }
    return { reservation, alreadyProcessed: false };
  });

  await triggerOutboxAfterCommit(pool, provider, logger);
  return result;
}

export { previewReservationAction } from './action-tokens.service.js';
export type { ActionPreview } from './action-tokens.service.js';
