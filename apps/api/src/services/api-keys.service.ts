import type { Pool } from 'pg';
import type { AppConfig } from '../config/index.js';
import { UnauthorizedError } from '../errors/app-error.js';
import * as apiKeysRepo from '../repositories/api-keys.repository.js';
import type { IntegrationApiKey } from '../types/domain.js';
import { generateOpaqueSecret, hashSecret, publicKeyPrefix } from '../utils/crypto.js';

export interface CreatedApiKey {
  plaintextKey: string;
  prefix: string;
  name: string;
}

/**
 * Generates a new POS integration key. The plaintext key is returned exactly
 * once here and is never recoverable afterwards — only its hash and a short
 * non-secret prefix (for admin recognition) are persisted.
 */
export async function createApiKey(pool: Pool, config: AppConfig, name: string): Promise<CreatedApiKey> {
  const secret = generateOpaqueSecret();
  const prefix = publicKeyPrefix(secret);
  const hash = hashSecret(secret, config.posApiKeyPepper);
  await apiKeysRepo.insertApiKey(pool, name, prefix, hash);
  return { plaintextKey: secret, prefix, name };
}

export async function revokeApiKey(pool: Pool, prefix: string): Promise<boolean> {
  return apiKeysRepo.revokeApiKeyByPrefix(pool, prefix);
}

export async function listApiKeys(pool: Pool): Promise<IntegrationApiKey[]> {
  return apiKeysRepo.listApiKeys(pool);
}

export async function authenticateApiKey(
  pool: Pool,
  config: AppConfig,
  providedKey: string,
): Promise<IntegrationApiKey> {
  const hash = hashSecret(providedKey, config.posApiKeyPepper);
  const apiKey = await apiKeysRepo.findActiveApiKeyByHash(pool, hash);
  if (!apiKey) {
    throw new UnauthorizedError('Ungültiger oder widerrufener API-Key.');
  }
  await apiKeysRepo.touchApiKeyLastUsed(pool, apiKey.id);
  return apiKey;
}
