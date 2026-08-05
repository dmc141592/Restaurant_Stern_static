import { Pool } from 'pg';
import { inject } from 'vitest';

let pool: Pool | undefined;

export function getTestPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: inject('databaseUrl'), max: 5 });
  }
  return pool;
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/** Wipes every table the reservation flow can write to, keeping schema/migrations intact. */
export async function resetDatabase(): Promise<void> {
  const db = getTestPool();
  await db.query(`
    TRUNCATE TABLE
      pos_export_log,
      reservation_status_history,
      reservation_action_tokens,
      exclusive_reservation_allocations,
      notification_outbox,
      idempotency_keys,
      event_areas,
      events,
      availability_blocks,
      reservations,
      integration_api_keys,
      admin_sessions,
      administrators,
      special_hours,
      opening_hours,
      areas
    RESTART IDENTITY CASCADE;
  `);
  await db.query('UPDATE booking_settings SET min_advance_minutes = 0, max_advance_days = 365 WHERE id = TRUE');
}

export interface SeedAreaInput {
  slug: string;
  name: string;
  resourceMode: 'CAPACITY' | 'EXCLUSIVE';
  capacity: number;
  isActive?: boolean;
  isOnlineBookable?: boolean;
  defaultDurationMinutes?: number;
}

export async function seedArea(input: SeedAreaInput): Promise<string> {
  const db = getTestPool();
  const result = await db.query<{ id: string }>(
    `INSERT INTO areas (slug, name, resource_mode, capacity, is_active, is_online_bookable, default_duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.slug,
      input.name,
      input.resourceMode,
      input.capacity,
      input.isActive ?? true,
      input.isOnlineBookable ?? true,
      input.defaultDurationMinutes ?? 120,
    ],
  );
  return result.rows[0]!.id;
}

/** Opens the restaurant every day, all day — keeps most tests from having to think about hours. */
export async function seedAlwaysOpenHours(): Promise<void> {
  const db = getTestPool();
  for (let weekday = 0; weekday <= 6; weekday += 1) {
    await db.query(
      `INSERT INTO opening_hours (weekday, opens_at, closes_at) VALUES ($1, '00:00', '23:59')`,
      [weekday],
    );
  }
}

export async function seedAdministrator(email: string, passwordHash: string): Promise<string> {
  const db = getTestPool();
  const result = await db.query<{ id: string }>(
    `INSERT INTO administrators (email, password_hash) VALUES ($1, $2) RETURNING id`,
    [email, passwordHash],
  );
  return result.rows[0]!.id;
}
