import type { DbClient } from '../db/client.js';
import type { Area } from '../types/domain.js';
import type { ResourceMode } from '@sternen/shared';

interface AreaRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  resource_mode: ResourceMode;
  capacity: number;
  default_duration_minutes: number;
  slot_interval_minutes: number;
  is_active: boolean;
  is_online_bookable: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: AreaRow): Area {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    resourceMode: row.resource_mode,
    capacity: row.capacity,
    defaultDurationMinutes: row.default_duration_minutes,
    slotIntervalMinutes: row.slot_interval_minutes,
    isActive: row.is_active,
    isOnlineBookable: row.is_online_bookable,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findAllAreas(client: DbClient): Promise<Area[]> {
  const result = await client.query<AreaRow>('SELECT * FROM areas ORDER BY sort_order, name');
  return result.rows.map(mapRow);
}

export async function findActiveOnlineBookableAreas(client: DbClient): Promise<Area[]> {
  const result = await client.query<AreaRow>(
    'SELECT * FROM areas WHERE is_active = TRUE AND is_online_bookable = TRUE ORDER BY sort_order, name',
  );
  return result.rows.map(mapRow);
}

export async function findAreaById(client: DbClient, id: string): Promise<Area | null> {
  const result = await client.query<AreaRow>('SELECT * FROM areas WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findAreaBySlug(client: DbClient, slug: string): Promise<Area | null> {
  const result = await client.query<AreaRow>('SELECT * FROM areas WHERE slug = $1', [slug]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export interface CreateAreaData {
  slug: string;
  name: string;
  description: string | null;
  resourceMode: ResourceMode;
  capacity: number;
  defaultDurationMinutes: number;
  slotIntervalMinutes: number;
  isActive: boolean;
  isOnlineBookable: boolean;
  sortOrder: number;
}

export async function insertArea(client: DbClient, data: CreateAreaData): Promise<Area> {
  const result = await client.query<AreaRow>(
    `INSERT INTO areas
      (slug, name, description, resource_mode, capacity, default_duration_minutes,
       slot_interval_minutes, is_active, is_online_bookable, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      data.slug,
      data.name,
      data.description,
      data.resourceMode,
      data.capacity,
      data.defaultDurationMinutes,
      data.slotIntervalMinutes,
      data.isActive,
      data.isOnlineBookable,
      data.sortOrder,
    ],
  );
  return mapRow(result.rows[0]!);
}

export interface UpdateAreaData {
  name?: string;
  description?: string | null;
  capacity?: number;
  defaultDurationMinutes?: number;
  slotIntervalMinutes?: number;
  isActive?: boolean;
  isOnlineBookable?: boolean;
  sortOrder?: number;
}

export async function updateArea(
  client: DbClient,
  id: string,
  data: UpdateAreaData,
): Promise<Area | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  const columnMap: Record<string, unknown> = {
    name: data.name,
    description: data.description,
    capacity: data.capacity,
    default_duration_minutes: data.defaultDurationMinutes,
    slot_interval_minutes: data.slotIntervalMinutes,
    is_active: data.isActive,
    is_online_bookable: data.isOnlineBookable,
    sort_order: data.sortOrder,
  };

  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      fields.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }
  }

  if (fields.length === 0) {
    return findAreaById(client, id);
  }

  values.push(id);
  const result = await client.query<AreaRow>(
    `UPDATE areas SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    values,
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}
