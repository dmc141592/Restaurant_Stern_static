import type { Pool } from 'pg';
import type { CreateBlockInput, UpdateBlockInput } from '@sternen/shared';
import type { AppConfig } from '../config/index.js';
import { BlockConflictError, NotFoundError, ValidationError } from '../errors/app-error.js';
import * as blocksRepo from '../repositories/blocks.repository.js';
import * as reservationsRepo from '../repositories/reservations.repository.js';
import type { AvailabilityBlock } from '../types/domain.js';
import {
  AmbiguousLocalTimeError,
  NonExistentLocalTimeError,
  localDateTimeToInstant,
} from '../utils/time.js';

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

export interface ConflictingReservationSummary {
  reference: string;
  guestName: string;
  startsAt: string;
  endsAt: string;
  partySize: number;
  areaName: string;
}

async function checkConflicts(
  pool: Pool,
  areaId: string | null,
  startsAt: Date,
  endsAt: Date,
): Promise<ConflictingReservationSummary[]> {
  const overlapping = await reservationsRepo.findOverlappingBlockingReservations(
    pool,
    areaId,
    startsAt,
    endsAt,
  );
  return overlapping.map((reservation) => ({
    reference: reservation.publicReference,
    guestName: `${reservation.guestFirstName} ${reservation.guestLastName}`,
    startsAt: reservation.startsAt.toISOString(),
    endsAt: reservation.endsAt.toISOString(),
    partySize: reservation.partySize,
    areaName: reservation.areaName,
  }));
}

export async function createBlock(
  pool: Pool,
  config: AppConfig,
  input: CreateBlockInput,
  adminId: string,
): Promise<AvailabilityBlock> {
  const startsAt = toInstant(config.businessTimeZone, input.startDate, input.startTime);
  const endsAt = toInstant(config.businessTimeZone, input.endDate, input.endTime);
  if (endsAt <= startsAt) {
    throw new ValidationError('Das Ende der Sperrung muss nach dem Beginn liegen.');
  }

  const areaId = input.areaId ?? null;
  if (!input.acknowledgeConflicts) {
    const conflicts = await checkConflicts(pool, areaId, startsAt, endsAt);
    if (conflicts.length > 0) {
      throw new BlockConflictError(
        'Diese Sperrung überschneidet sich mit bestehenden Reservationen. Bitte prüfen und bewusst bestätigen.',
        { conflicts },
      );
    }
  }

  return blocksRepo.insertBlock(pool, {
    areaId,
    blockType: input.blockType,
    title: input.title,
    reason: input.reason ?? null,
    startsAt,
    endsAt,
    blockedCapacity: input.blockedCapacity ?? null,
    createdByAdminId: adminId,
  });
}

export async function updateBlock(
  pool: Pool,
  config: AppConfig,
  id: string,
  input: UpdateBlockInput,
): Promise<AvailabilityBlock> {
  const existing = await blocksRepo.findBlockById(pool, id);
  if (!existing) {
    throw new NotFoundError('Sperrung nicht gefunden.');
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
    throw new ValidationError('Das Ende der Sperrung muss nach dem Beginn liegen.');
  }

  const timeChanged = startsAt.getTime() !== existing.startsAt.getTime() || endsAt.getTime() !== existing.endsAt.getTime();
  if (timeChanged && !input.acknowledgeConflicts) {
    const conflicts = await checkConflicts(pool, existing.areaId, startsAt, endsAt);
    if (conflicts.length > 0) {
      throw new BlockConflictError(
        'Die geänderte Sperrung überschneidet sich mit bestehenden Reservationen. Bitte prüfen und bewusst bestätigen.',
        { conflicts },
      );
    }
  }

  const updated = await blocksRepo.updateBlock(pool, id, {
    title: input.title,
    reason: input.reason,
    startsAt: timeChanged ? startsAt : undefined,
    endsAt: timeChanged ? endsAt : undefined,
    blockedCapacity: input.blockedCapacity,
  });
  if (!updated) {
    throw new NotFoundError('Sperrung nicht gefunden.');
  }
  return updated;
}

export async function deleteBlock(pool: Pool, id: string): Promise<void> {
  const deleted = await blocksRepo.deleteBlock(pool, id);
  if (!deleted) {
    throw new NotFoundError('Sperrung nicht gefunden.');
  }
}

export async function listBlocks(
  pool: Pool,
  filter: blocksRepo.BlockFilter,
): Promise<AvailabilityBlock[]> {
  return blocksRepo.listBlocks(pool, filter);
}
