import type { Pool } from 'pg';
import type { CreateAreaInput, UpdateAreaInput } from '@sternen/shared';
import { NotFoundError, ValidationError } from '../errors/app-error.js';
import * as areasRepo from '../repositories/areas.repository.js';
import type { Area } from '../types/domain.js';

export async function listAreas(pool: Pool): Promise<Area[]> {
  return areasRepo.findAllAreas(pool);
}

export async function listPublicAreas(pool: Pool): Promise<Area[]> {
  return areasRepo.findActiveOnlineBookableAreas(pool);
}

export async function createArea(pool: Pool, input: CreateAreaInput): Promise<Area> {
  const existing = await areasRepo.findAreaBySlug(pool, input.slug);
  if (existing) {
    throw new ValidationError(`Ein Bereich mit dem Slug "${input.slug}" existiert bereits.`);
  }
  return areasRepo.insertArea(pool, {
    slug: input.slug,
    name: input.name,
    description: input.description ?? null,
    resourceMode: input.resourceMode,
    capacity: input.capacity,
    defaultDurationMinutes: input.defaultDurationMinutes,
    slotIntervalMinutes: input.slotIntervalMinutes,
    isActive: input.isActive,
    isOnlineBookable: input.isOnlineBookable,
    sortOrder: input.sortOrder,
  });
}

export async function updateArea(pool: Pool, id: string, input: UpdateAreaInput): Promise<Area> {
  const updated = await areasRepo.updateArea(pool, id, input);
  if (!updated) {
    throw new NotFoundError('Bereich nicht gefunden.');
  }
  return updated;
}
