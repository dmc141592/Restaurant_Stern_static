import type { Pool, PoolClient } from 'pg';
import type { DbClient } from './client.js';

/**
 * Runs `fn` inside a single Postgres transaction on a dedicated connection.
 * Commits on success, rolls back on any thrown error (including errors
 * thrown by `fn` after partial writes), and always releases the connection.
 */
export async function withTransaction<T>(
  pool: Pool,
  fn: (client: DbClient) => Promise<T>,
): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      // Rollback failure only matters if the connection is unusable; releasing
      // it below returns it to the pool, which will discard broken connections.
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Takes a transaction-scoped advisory lock on `key` for the remainder of the
 * current transaction. Used to serialise capacity checks per area so two
 * concurrent reservation requests cannot both read stale availability and
 * both insert.
 */
export async function acquireAreaLock(client: DbClient, areaId: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))', [areaId]);
}
