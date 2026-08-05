import type { Pool } from 'pg';
import type { ReservationActionType } from '@sternen/shared';
import type { AppConfig } from '../config/index.js';
import type { DbClient } from '../db/client.js';
import { InvalidActionTokenError } from '../errors/app-error.js';
import * as tokensRepo from '../repositories/reservation-action-tokens.repository.js';
import * as reservationsRepo from '../repositories/reservations.repository.js';
import type { ReservationWithArea } from '../types/domain.js';
import { generateOpaqueSecret, hashSecret } from '../utils/crypto.js';

/**
 * Split out from reservation.service.ts / reservation-actions.service.ts so
 * both can depend on it without a circular module dependency (reservation
 * status transitions need to mint/revoke tokens; the action endpoints need
 * to consume them).
 */
export async function issueActionTokenPair(
  client: DbClient,
  config: AppConfig,
  reservationId: string,
): Promise<{ confirmUrl: string; rejectUrl: string }> {
  const confirmSecret = generateOpaqueSecret();
  const rejectSecret = generateOpaqueSecret();

  await tokensRepo.insertActionToken(
    client,
    reservationId,
    'CONFIRM',
    hashSecret(confirmSecret, config.tokenHashPepper),
  );
  await tokensRepo.insertActionToken(
    client,
    reservationId,
    'REJECT',
    hashSecret(rejectSecret, config.tokenHashPepper),
  );

  const base = config.actionLinkBaseUrl.replace(/\/+$/, '');
  return {
    confirmUrl: `${base}/${confirmSecret}`,
    rejectUrl: `${base}/${rejectSecret}`,
  };
}

export async function revokeReservationActionTokens(
  client: DbClient,
  reservationId: string,
): Promise<void> {
  await tokensRepo.revokeActionTokensForReservation(client, reservationId);
}

export interface ActionPreview {
  action: ReservationActionType;
  alreadyUsed: boolean;
  isRevoked: boolean;
  reservation: ReservationWithArea;
}

/**
 * GET preview: intentionally read-only and side-effect-free, so that email
 * security scanners or link-preview bots that automatically open the URL
 * cannot trigger a status change (see brief section 11).
 */
export async function previewReservationAction(
  pool: Pool,
  config: AppConfig,
  tokenPlaintext: string,
): Promise<ActionPreview> {
  const tokenHash = hashSecret(tokenPlaintext, config.tokenHashPepper);
  const token = await tokensRepo.findActionTokenByHash(pool, tokenHash);
  if (!token) {
    throw new InvalidActionTokenError();
  }
  const reservation = await reservationsRepo.findReservationById(pool, token.reservationId);
  if (!reservation) {
    throw new InvalidActionTokenError();
  }
  return {
    action: token.action,
    alreadyUsed: token.usedAt !== null,
    isRevoked: token.revokedAt !== null,
    reservation,
  };
}

export async function findTokenByHashForUpdate(
  client: DbClient,
  config: AppConfig,
  tokenPlaintext: string,
) {
  const tokenHash = hashSecret(tokenPlaintext, config.tokenHashPepper);
  return tokensRepo.findActionTokenByHashForUpdate(client, tokenHash);
}

export async function markActionTokenUsed(client: DbClient, tokenId: string): Promise<void> {
  await tokensRepo.markActionTokenUsed(client, tokenId);
}
