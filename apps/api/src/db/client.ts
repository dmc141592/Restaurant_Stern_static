import { Pool, type PoolClient } from 'pg';
import type { AppConfig } from '../config/index.js';

export type DbClient = Pick<PoolClient, 'query'>;

let pool: Pool | undefined;

export function createPool(config: AppConfig): Pool {
  pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool wurde noch nicht initialisiert. createPool() zuerst aufrufen.');
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
