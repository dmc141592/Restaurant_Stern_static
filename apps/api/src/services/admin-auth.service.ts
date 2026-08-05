import { timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { AppConfig } from '../config/index.js';
import type { DbClient } from '../db/client.js';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import * as adminsRepo from '../repositories/administrators.repository.js';
import type { Administrator } from '../types/domain.js';
import { generateOpaqueSecret, hashSecret } from '../utils/crypto.js';
import { verifyPassword } from '../utils/password.js';

const GENERIC_LOGIN_ERROR = 'E-Mail-Adresse oder Passwort ist ungültig.';

export interface LoginResult {
  administrator: Administrator;
  sessionSecret: string;
  csrfSecret: string;
  expiresAt: Date;
}

export async function login(pool: Pool, config: AppConfig, email: string, password: string): Promise<LoginResult> {
  const administrator = await adminsRepo.findAdministratorByEmail(pool, email);
  // Always run the hash comparison, even for an unknown email, using a fixed
  // dummy hash — this keeps response timing independent of whether the
  // account exists, avoiding a user-enumeration side channel.
  const hashToCheck =
    administrator?.passwordHash ??
    '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  const passwordMatches = await verifyPassword(hashToCheck, password);

  if (!administrator || !administrator.isActive || !passwordMatches) {
    throw new UnauthorizedError(GENERIC_LOGIN_ERROR);
  }

  await adminsRepo.touchAdministratorLastLogin(pool, administrator.id);

  const sessionSecret = generateOpaqueSecret();
  const csrfSecret = generateOpaqueSecret();
  const expiresAt = new Date(Date.now() + config.session.ttlSeconds * 1000);

  await adminsRepo.insertAdminSession(
    pool,
    administrator.id,
    hashSecret(sessionSecret, config.session.secret),
    hashSecret(csrfSecret, config.session.secret),
    expiresAt,
  );

  return { administrator, sessionSecret, csrfSecret, expiresAt };
}

export async function logout(pool: Pool, config: AppConfig, sessionSecret: string): Promise<void> {
  await adminsRepo.revokeSessionByTokenHash(pool, hashSecret(sessionSecret, config.session.secret));
}

export interface AuthenticatedSession {
  administrator: Administrator;
  csrfTokenHash: string;
}

export async function validateSession(
  client: DbClient,
  config: AppConfig,
  sessionSecret: string,
): Promise<AuthenticatedSession | null> {
  const session = await adminsRepo.findActiveSessionByTokenHash(
    client,
    hashSecret(sessionSecret, config.session.secret),
  );
  if (!session) {
    return null;
  }
  const administrator = await adminsRepo.findAdministratorById(client, session.administratorId);
  if (!administrator || !administrator.isActive) {
    return null;
  }
  return { administrator, csrfTokenHash: session.csrfTokenHash };
}

export function assertCsrfTokenValid(session: AuthenticatedSession, config: AppConfig, providedCsrfToken: string | undefined): void {
  if (!providedCsrfToken) {
    throw new ForbiddenError('CSRF-Token fehlt.');
  }
  const providedHash = Buffer.from(hashSecret(providedCsrfToken, config.session.secret), 'utf8');
  const expectedHash = Buffer.from(session.csrfTokenHash, 'utf8');
  if (providedHash.length !== expectedHash.length || !timingSafeEqual(providedHash, expectedHash)) {
    throw new ForbiddenError('CSRF-Token ist ungültig.');
  }
}
