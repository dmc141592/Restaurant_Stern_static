import type { DbClient } from '../db/client.js';
import type { OpeningHour, SpecialHour } from '../types/domain.js';

interface OpeningHourRow {
  id: string;
  weekday: number;
  opens_at: string;
  closes_at: string;
  is_enabled: boolean;
}

function mapOpeningHourRow(row: OpeningHourRow): OpeningHour {
  return {
    id: row.id,
    weekday: row.weekday,
    opensAt: row.opens_at.slice(0, 5),
    closesAt: row.closes_at.slice(0, 5),
    isEnabled: row.is_enabled,
  };
}

export async function findAllOpeningHours(client: DbClient): Promise<OpeningHour[]> {
  const result = await client.query<OpeningHourRow>(
    'SELECT * FROM opening_hours ORDER BY weekday, opens_at',
  );
  return result.rows.map(mapOpeningHourRow);
}

export async function findOpeningHoursForWeekday(
  client: DbClient,
  weekday: number,
): Promise<OpeningHour[]> {
  const result = await client.query<OpeningHourRow>(
    'SELECT * FROM opening_hours WHERE weekday = $1 AND is_enabled = TRUE ORDER BY opens_at',
    [weekday],
  );
  return result.rows.map(mapOpeningHourRow);
}

export async function replaceOpeningHours(
  client: DbClient,
  entries: Array<{ weekday: number; opensAt: string; closesAt: string; isEnabled: boolean }>,
): Promise<OpeningHour[]> {
  await client.query('DELETE FROM opening_hours');
  const inserted: OpeningHour[] = [];
  for (const entry of entries) {
    const result = await client.query<OpeningHourRow>(
      `INSERT INTO opening_hours (weekday, opens_at, closes_at, is_enabled)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [entry.weekday, entry.opensAt, entry.closesAt, entry.isEnabled],
    );
    inserted.push(mapOpeningHourRow(result.rows[0]!));
  }
  return inserted;
}

interface SpecialHourRow {
  id: string;
  business_date: string;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
  label: string | null;
}

function mapSpecialHourRow(row: SpecialHourRow): SpecialHour {
  return {
    id: row.id,
    businessDate: row.business_date,
    opensAt: row.opens_at ? row.opens_at.slice(0, 5) : null,
    closesAt: row.closes_at ? row.closes_at.slice(0, 5) : null,
    isClosed: row.is_closed,
    label: row.label,
  };
}

export async function findAllSpecialHours(client: DbClient): Promise<SpecialHour[]> {
  const result = await client.query<SpecialHourRow>(
    'SELECT * FROM special_hours ORDER BY business_date',
  );
  return result.rows.map(mapSpecialHourRow);
}

export async function findSpecialHourForDate(
  client: DbClient,
  businessDate: string,
): Promise<SpecialHour | null> {
  const result = await client.query<SpecialHourRow>(
    'SELECT * FROM special_hours WHERE business_date = $1',
    [businessDate],
  );
  return result.rows[0] ? mapSpecialHourRow(result.rows[0]) : null;
}

export interface CreateSpecialHourData {
  businessDate: string;
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  label: string | null;
}

export async function insertSpecialHour(
  client: DbClient,
  data: CreateSpecialHourData,
): Promise<SpecialHour> {
  const result = await client.query<SpecialHourRow>(
    `INSERT INTO special_hours (business_date, is_closed, opens_at, closes_at, label)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.businessDate, data.isClosed, data.opensAt, data.closesAt, data.label],
  );
  return mapSpecialHourRow(result.rows[0]!);
}

export async function findSpecialHourById(client: DbClient, id: string): Promise<SpecialHour | null> {
  const result = await client.query<SpecialHourRow>('SELECT * FROM special_hours WHERE id = $1', [
    id,
  ]);
  return result.rows[0] ? mapSpecialHourRow(result.rows[0]) : null;
}

export interface UpdateSpecialHourData {
  isClosed?: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
  label?: string | null;
}

export async function updateSpecialHour(
  client: DbClient,
  id: string,
  data: UpdateSpecialHourData,
): Promise<SpecialHour | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  const columnMap: Record<string, unknown> = {
    is_closed: data.isClosed,
    opens_at: data.opensAt,
    closes_at: data.closesAt,
    label: data.label,
  };
  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      fields.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }
  }
  if (fields.length === 0) {
    return findSpecialHourById(client, id);
  }
  values.push(id);
  const result = await client.query<SpecialHourRow>(
    `UPDATE special_hours SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    values,
  );
  return result.rows[0] ? mapSpecialHourRow(result.rows[0]) : null;
}

export async function deleteSpecialHour(client: DbClient, id: string): Promise<boolean> {
  const result = await client.query('DELETE FROM special_hours WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
