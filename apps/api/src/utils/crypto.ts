import { createHash, createHmac, randomBytes } from 'node:crypto';

/** Generates a high-entropy, URL-safe opaque secret (e.g. action tokens, API keys). */
export function generateOpaqueSecret(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Deterministically hashes a secret with a server-side pepper before storage.
 * The pepper is never stored in the database and is required (in addition to
 * the raw secret) to ever recompute a valid hash, so leaking the DB alone is
 * not enough to forge or replay a token/API key.
 */
export function hashSecret(secret: string, pepper: string): string {
  return createHmac('sha256', pepper).update(secret, 'utf8').digest('hex');
}

/** Short, non-secret prefix shown to admins so they can recognise an API key. */
export function publicKeyPrefix(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, 8);
}

export function generatePublicReference(year: number): string {
  const suffix = randomBytes(4)
    .toString('hex')
    .toUpperCase()
    .slice(0, 6);
  return `STERNEN-${year}-${suffix}`;
}
