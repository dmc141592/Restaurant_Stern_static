import type { DbClient } from '../db/client.js';
import type { EventArea, EventRecord } from '../types/domain.js';

interface EventRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  starts_at: Date;
  ends_at: Date;
  is_published: boolean;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateEventData {
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
}

export async function insertEvent(client: DbClient, data: CreateEventData): Promise<EventRecord> {
  const result = await client.query<EventRow>(
    `INSERT INTO events (slug, title, summary, description, starts_at, ends_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.slug, data.title, data.summary, data.description, data.startsAt, data.endsAt],
  );
  return mapRow(result.rows[0]!);
}

export async function findEventById(client: DbClient, id: string): Promise<EventRecord | null> {
  const result = await client.query<EventRow>('SELECT * FROM events WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function findEventBySlug(client: DbClient, slug: string): Promise<EventRecord | null> {
  const result = await client.query<EventRow>('SELECT * FROM events WHERE slug = $1', [slug]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function listAllEvents(client: DbClient): Promise<EventRecord[]> {
  const result = await client.query<EventRow>('SELECT * FROM events ORDER BY starts_at DESC');
  return result.rows.map(mapRow);
}

export async function listPublishedUpcomingEvents(
  client: DbClient,
  now: Date,
): Promise<EventRecord[]> {
  const result = await client.query<EventRow>(
    `SELECT * FROM events
     WHERE is_published = TRUE AND ends_at >= $1
     ORDER BY starts_at ASC`,
    [now],
  );
  return result.rows.map(mapRow);
}

export interface UpdateEventData {
  title?: string;
  summary?: string;
  description?: string | null;
  startsAt?: Date;
  endsAt?: Date;
  isPublished?: boolean;
  publishedAt?: Date | null;
}

export async function updateEvent(
  client: DbClient,
  id: string,
  data: UpdateEventData,
): Promise<EventRecord | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  const columnMap: Record<string, unknown> = {
    title: data.title,
    summary: data.summary,
    description: data.description,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    is_published: data.isPublished,
    published_at: data.publishedAt,
  };
  for (const [column, value] of Object.entries(columnMap)) {
    if (value !== undefined) {
      fields.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    }
  }
  if (fields.length === 0) {
    return findEventById(client, id);
  }
  values.push(id);
  const result = await client.query<EventRow>(
    `UPDATE events SET ${fields.join(', ')} WHERE id = $${index} RETURNING *`,
    values,
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function deleteEvent(client: DbClient, id: string): Promise<boolean> {
  const result = await client.query('DELETE FROM events WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

interface EventAreaRow {
  event_id: string;
  area_id: string;
  area_name: string;
  availability_block_id: string | null;
}

export async function findEventAreas(client: DbClient, eventId: string): Promise<EventArea[]> {
  const result = await client.query<EventAreaRow>(
    `SELECT ea.event_id, ea.area_id, a.name AS area_name, ea.availability_block_id
     FROM event_areas ea
     JOIN areas a ON a.id = ea.area_id
     WHERE ea.event_id = $1`,
    [eventId],
  );
  return result.rows.map((row) => ({
    eventId: row.event_id,
    areaId: row.area_id,
    areaName: row.area_name,
    availabilityBlockId: row.availability_block_id,
  }));
}

export async function findEventAreasForEvents(
  client: DbClient,
  eventIds: string[],
): Promise<Map<string, EventArea[]>> {
  if (eventIds.length === 0) {
    return new Map();
  }
  const result = await client.query<EventAreaRow>(
    `SELECT ea.event_id, ea.area_id, a.name AS area_name, ea.availability_block_id
     FROM event_areas ea
     JOIN areas a ON a.id = ea.area_id
     WHERE ea.event_id = ANY($1::uuid[])`,
    [eventIds],
  );
  const map = new Map<string, EventArea[]>();
  for (const row of result.rows) {
    const list = map.get(row.event_id) ?? [];
    list.push({
      eventId: row.event_id,
      areaId: row.area_id,
      areaName: row.area_name,
      availabilityBlockId: row.availability_block_id,
    });
    map.set(row.event_id, list);
  }
  return map;
}

export async function insertEventArea(
  client: DbClient,
  eventId: string,
  areaId: string,
  availabilityBlockId: string | null,
): Promise<void> {
  await client.query(
    `INSERT INTO event_areas (event_id, area_id, availability_block_id) VALUES ($1, $2, $3)`,
    [eventId, areaId, availabilityBlockId],
  );
}

export async function deleteEventAreas(client: DbClient, eventId: string): Promise<string[]> {
  const result = await client.query<{ availability_block_id: string | null }>(
    `DELETE FROM event_areas WHERE event_id = $1 RETURNING availability_block_id`,
    [eventId],
  );
  return result.rows
    .map((row) => row.availability_block_id)
    .filter((id): id is string => id !== null);
}
