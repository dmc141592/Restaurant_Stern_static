import type { DbClient } from '../db/client.js';
import type { IntegrationApiKey } from '../types/domain.js';

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  is_active: boolean;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

function mapRow(row: ApiKeyRow): IntegrationApiKey {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    keyHash: row.key_hash,
    isActive: row.is_active,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

export async function insertApiKey(
  client: DbClient,
  name: string,
  keyPrefix: string,
  keyHash: string,
): Promise<IntegrationApiKey> {
  const result = await client.query<ApiKeyRow>(
    `INSERT INTO integration_api_keys (name, key_prefix, key_hash) VALUES ($1, $2, $3) RETURNING *`,
    [name, keyPrefix, keyHash],
  );
  return mapRow(result.rows[0]!);
}

export async function findActiveApiKeyByHash(
  client: DbClient,
  keyHash: string,
): Promise<IntegrationApiKey | null> {
  const result = await client.query<ApiKeyRow>(
    `SELECT * FROM integration_api_keys WHERE key_hash = $1 AND is_active = TRUE AND revoked_at IS NULL`,
    [keyHash],
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function touchApiKeyLastUsed(client: DbClient, id: string): Promise<void> {
  await client.query('UPDATE integration_api_keys SET last_used_at = now() WHERE id = $1', [id]);
}

export async function listApiKeys(client: DbClient): Promise<IntegrationApiKey[]> {
  const result = await client.query<ApiKeyRow>(
    'SELECT * FROM integration_api_keys ORDER BY created_at DESC',
  );
  return result.rows.map(mapRow);
}

export async function revokeApiKeyByPrefix(client: DbClient, keyPrefix: string): Promise<boolean> {
  const result = await client.query(
    `UPDATE integration_api_keys SET is_active = FALSE, revoked_at = now()
     WHERE key_prefix = $1 AND revoked_at IS NULL`,
    [keyPrefix],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function recordPosExport(
  client: DbClient,
  reservationId: string,
  apiKeyId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO pos_export_log (reservation_id, api_key_id) VALUES ($1, $2)
     ON CONFLICT (reservation_id, api_key_id) DO NOTHING`,
    [reservationId, apiKeyId],
  );
}
