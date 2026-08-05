import type { BlockType } from '@sternen/shared';
import type { DbClient } from '../db/client.js';
import type { AvailabilityBlock } from '../types/domain.js';

interface BlockRow {
  id: string;
  area_id: string | null;
  area_name: string | null;
  block_type: BlockType;
  title: string;
  reason: string | null;
  starts_at: Date;
  ends_at: Date;
  blocked_capacity: number | null;
  created_by_admin_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: BlockRow): AvailabilityBlock {
  return {
    id: row.id,
    areaId: row.area_id,
    areaName: row.area_name,
    blockType: row.block_type,
    title: row.title,
    reason: row.reason,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    blockedCapacity: row.blocked_capacity,
    createdByAdminId: row.created_by_admin_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_WITH_AREA = `
  SELECT b.*, a.name AS area_name
  FROM availability_blocks b
  LEFT JOIN areas a ON a.id = b.area_id
`;

export interface CreateBlockData {
  areaId: string | null;
  blockType: BlockType;
  title: string;
  reason: string | null;
  startsAt: Date;
  endsAt: Date;
  blockedCapacity: number | null;
  createdByAdminId: string | null;
}

export async function insertBlock(client: DbClient, data: CreateBlockData): Promise<AvailabilityBlock> {
  const result = await client.query<BlockRow>(
    `INSERT INTO availability_blocks
      (area_id, block_type, title, reason, starts_at, ends_at, blocked_capacity, created_by_admin_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *, (SELECT name FROM areas WHERE id = $1) AS area_name`,
    [
      data.areaId,
      data.blockType,
      data.title,
      data.reason,
      data.startsAt,
      data.endsAt,
      data.blockedCapacity,
      data.createdByAdminId,
    ],
  );
  return mapRow(result.rows[0]!);
}

export async function findBlockById(client: DbClient, id: string): Promise<AvailabilityBlock | null> {
  const result = await client.query<BlockRow>(`${SELECT_WITH_AREA} WHERE b.id = $1`, [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export interface BlockFilter {
  areaId?: string;
  from?: Date;
  to?: Date;
}

export async function listBlocks(client: DbClient, filter: BlockFilter): Promise<AvailabilityBlock[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (filter.areaId) {
    conditions.push(`(b.area_id = $${index} OR b.area_id IS NULL)`);
    values.push(filter.areaId);
    index += 1;
  }
  if (filter.from) {
    conditions.push(`b.ends_at > $${index}`);
    values.push(filter.from);
    index += 1;
  }
  if (filter.to) {
    conditions.push(`b.starts_at < $${index}`);
    values.push(filter.to);
    index += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await client.query<BlockRow>(
    `${SELECT_WITH_AREA} ${whereClause} ORDER BY b.starts_at`,
    values,
  );
  return result.rows.map(mapRow);
}

/** Blocks affecting `areaId` (or all areas, i.e. area_id IS NULL) overlapping the window. */
export async function findOverlappingBlocks(
  client: DbClient,
  areaId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<AvailabilityBlock[]> {
  const result = await client.query<BlockRow>(
    `${SELECT_WITH_AREA}
     WHERE (b.area_id = $1 OR b.area_id IS NULL)
       AND b.starts_at < $3 AND b.ends_at > $2
     ORDER BY b.starts_at`,
    [areaId, startsAt, endsAt],
  );
  return result.rows.map(mapRow);
}

export interface UpdateBlockData {
  title?: string;
  reason?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  blockedCapacity?: number | null;
}

export async function updateBlock(
  client: DbClient,
  id: string,
  data: UpdateBlockData,
): Promise<AvailabilityBlock | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  const columnMap: Record<string, unknown> = {
    title: data.title,
    reason: data.reason,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    blocked_capacity: data.blockedCapacity,
  };
  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      fields.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }
  }
  if (fields.length === 0) {
    return findBlockById(client, id);
  }
  values.push(id);
  await client.query(`UPDATE availability_blocks SET ${fields.join(', ')} WHERE id = $${index}`, values);
  return findBlockById(client, id);
}

export async function deleteBlock(client: DbClient, id: string): Promise<boolean> {
  const result = await client.query('DELETE FROM availability_blocks WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function deleteBlocksByIds(client: DbClient, ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }
  await client.query('DELETE FROM availability_blocks WHERE id = ANY($1::uuid[])', [ids]);
}
