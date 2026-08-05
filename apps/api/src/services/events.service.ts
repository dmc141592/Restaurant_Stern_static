import type { Pool } from 'pg';
import type { CreateEventInput, EventDto, UpdateEventInput } from '@sternen/shared';
import type { AppConfig } from '../config/index.js';
import type { DbClient } from '../db/client.js';
import { withTransaction } from '../db/transaction.js';
import { NotFoundError, ValidationError } from '../errors/app-error.js';
import * as blocksRepo from '../repositories/blocks.repository.js';
import * as eventsRepo from '../repositories/events.repository.js';
import type { EventRecord } from '../types/domain.js';
import { AmbiguousLocalTimeError, NonExistentLocalTimeError, localDateTimeToInstant } from '../utils/time.js';

function toInstant(zone: string, date: string, time: string): Date {
  try {
    return localDateTimeToInstant(zone, date, time).toJSDate();
  } catch (error) {
    if (error instanceof NonExistentLocalTimeError || error instanceof AmbiguousLocalTimeError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}

/**
 * Tears down whatever areas/blocks the event previously had and rebuilds
 * them from scratch. Running this on every create/update/unpublish/delete
 * keeps `availability_blocks` rows in perfect sync with the event's current
 * area selection and publish state — there is no code path that can leave a
 * stale block behind (see brief section 14).
 */
async function syncEventAreaBlocks(
  client: DbClient,
  eventId: string,
  eventTitle: string,
  areaIds: string[],
  startsAt: Date,
  endsAt: Date,
  blockAreas: boolean,
  blockReason: string | null,
  adminId: string | null,
): Promise<void> {
  const oldBlockIds = await eventsRepo.deleteEventAreas(client, eventId);
  await blocksRepo.deleteBlocksByIds(client, oldBlockIds);

  for (const areaId of areaIds) {
    let blockId: string | null = null;
    if (blockAreas) {
      const block = await blocksRepo.insertBlock(client, {
        areaId,
        blockType: 'PRIVATE_EVENT',
        title: `Event: ${eventTitle}`,
        reason: blockReason,
        startsAt,
        endsAt,
        blockedCapacity: null,
        createdByAdminId: adminId,
      });
      blockId = block.id;
    }
    await eventsRepo.insertEventArea(client, eventId, areaId, blockId);
  }
}

export async function createEvent(
  pool: Pool,
  config: AppConfig,
  input: CreateEventInput,
  adminId: string,
): Promise<EventRecord> {
  const startsAt = toInstant(config.businessTimeZone, input.startDate, input.startTime);
  const endsAt = toInstant(config.businessTimeZone, input.endDate, input.endTime);
  if (endsAt <= startsAt) {
    throw new ValidationError('Das Ende des Events muss nach dem Beginn liegen.');
  }

  return withTransaction(pool, async (client) => {
    const event = await eventsRepo.insertEvent(client, {
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      description: input.description ?? null,
      startsAt,
      endsAt,
    });

    await syncEventAreaBlocks(
      client,
      event.id,
      event.title,
      input.areaIds,
      startsAt,
      endsAt,
      input.blockAreas,
      input.blockReason ?? null,
      adminId,
    );

    return event;
  });
}

export async function updateEvent(
  pool: Pool,
  config: AppConfig,
  id: string,
  input: UpdateEventInput,
  adminId: string,
): Promise<EventRecord> {
  return withTransaction(pool, async (client) => {
    const existing = await eventsRepo.findEventById(client, id);
    if (!existing) {
      throw new NotFoundError('Event nicht gefunden.');
    }

    const startsAt =
      input.startDate && input.startTime
        ? toInstant(config.businessTimeZone, input.startDate, input.startTime)
        : existing.startsAt;
    const endsAt =
      input.endDate && input.endTime
        ? toInstant(config.businessTimeZone, input.endDate, input.endTime)
        : existing.endsAt;
    if (endsAt <= startsAt) {
      throw new ValidationError('Das Ende des Events muss nach dem Beginn liegen.');
    }

    const wasPublished = existing.isPublished;
    const willBePublished = input.isPublished ?? existing.isPublished;

    const updated = await eventsRepo.updateEvent(client, id, {
      title: input.title,
      summary: input.summary,
      description: input.description,
      startsAt,
      endsAt,
      isPublished: input.isPublished,
      publishedAt: !wasPublished && willBePublished ? new Date() : undefined,
    });
    if (!updated) {
      throw new NotFoundError('Event nicht gefunden.');
    }

    const timeChanged = startsAt.getTime() !== existing.startsAt.getTime() || endsAt.getTime() !== existing.endsAt.getTime();
    const areasChanged = input.areaIds !== undefined;
    const beingHidden = wasPublished && willBePublished === false;

    if (areasChanged || timeChanged || beingHidden) {
      const currentAreas = await eventsRepo.findEventAreas(client, id);
      const nextAreaIds = beingHidden ? [] : input.areaIds ?? currentAreas.map((a) => a.areaId);
      // Preserve whether blocks were originally requested by checking if any
      // existing area link already had one.
      const blockAreas = beingHidden ? false : currentAreas.some((a) => a.availabilityBlockId !== null);
      await syncEventAreaBlocks(
        client,
        id,
        updated.title,
        nextAreaIds,
        startsAt,
        endsAt,
        blockAreas,
        null,
        adminId,
      );
    }

    return updated;
  });
}

export async function deleteEvent(pool: Pool, id: string): Promise<void> {
  await withTransaction(pool, async (client) => {
    const existing = await eventsRepo.findEventById(client, id);
    if (!existing) {
      throw new NotFoundError('Event nicht gefunden.');
    }
    const blockIds = await eventsRepo.deleteEventAreas(client, id);
    await blocksRepo.deleteBlocksByIds(client, blockIds);
    await eventsRepo.deleteEvent(client, id);
  });
}

export async function listEventsForAdmin(pool: Pool): Promise<
  Array<EventRecord & { areaIds: string[] }>
> {
  const events = await eventsRepo.listAllEvents(pool);
  const areaMap = await eventsRepo.findEventAreasForEvents(pool, events.map((e) => e.id));
  return events.map((event) => ({
    ...event,
    areaIds: (areaMap.get(event.id) ?? []).map((a) => a.areaId),
  }));
}

export async function getEventForAdmin(
  pool: Pool,
  id: string,
): Promise<EventRecord & { areaIds: string[] }> {
  const event = await eventsRepo.findEventById(pool, id);
  if (!event) {
    throw new NotFoundError('Event nicht gefunden.');
  }
  const areas = await eventsRepo.findEventAreas(pool, id);
  return { ...event, areaIds: areas.map((a) => a.areaId) };
}

function toPublicDto(event: EventRecord, areaNames: Array<{ id: string; name: string }>): EventDto {
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    isPublished: event.isPublished,
    areas: areaNames,
  };
}

export async function listPublicEvents(pool: Pool): Promise<EventDto[]> {
  const events = await eventsRepo.listPublishedUpcomingEvents(pool, new Date());
  const areaMap = await eventsRepo.findEventAreasForEvents(pool, events.map((e) => e.id));
  return events.map((event) =>
    toPublicDto(
      event,
      (areaMap.get(event.id) ?? []).map((a) => ({ id: a.areaId, name: a.areaName })),
    ),
  );
}

export async function getPublicEventBySlug(pool: Pool, slug: string): Promise<EventDto> {
  const event = await eventsRepo.findEventBySlug(pool, slug);
  if (!event || !event.isPublished) {
    throw new NotFoundError('Event nicht gefunden.');
  }
  const areas = await eventsRepo.findEventAreas(pool, event.id);
  return toPublicDto(
    event,
    areas.map((a) => ({ id: a.areaId, name: a.areaName })),
  );
}
