import type { DbClient } from '../db/client.js';

export interface BookingSettings {
  minAdvanceMinutes: number;
  maxAdvanceDays: number;
}

interface BookingSettingsRow {
  min_advance_minutes: number;
  max_advance_days: number;
}

export async function getBookingSettings(client: DbClient): Promise<BookingSettings> {
  const result = await client.query<BookingSettingsRow>(
    'SELECT min_advance_minutes, max_advance_days FROM booking_settings WHERE id = TRUE',
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error('booking_settings Singleton-Zeile fehlt. Migrationen ausgeführt?');
  }
  return { minAdvanceMinutes: row.min_advance_minutes, maxAdvanceDays: row.max_advance_days };
}

export async function updateBookingSettings(
  client: DbClient,
  data: Partial<BookingSettings>,
): Promise<BookingSettings> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (data.minAdvanceMinutes !== undefined) {
    fields.push(`min_advance_minutes = $${index}`);
    values.push(data.minAdvanceMinutes);
    index += 1;
  }
  if (data.maxAdvanceDays !== undefined) {
    fields.push(`max_advance_days = $${index}`);
    values.push(data.maxAdvanceDays);
    index += 1;
  }
  if (fields.length === 0) {
    return getBookingSettings(client);
  }
  await client.query(`UPDATE booking_settings SET ${fields.join(', ')} WHERE id = TRUE`, values);
  return getBookingSettings(client);
}
