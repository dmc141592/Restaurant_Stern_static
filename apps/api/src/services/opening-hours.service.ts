import type { Pool } from 'pg';
import type {
  CreateSpecialHourInput,
  ReplaceOpeningHoursInput,
  UpdateSpecialHourInput,
} from '@sternen/shared';
import { NotFoundError, ValidationError } from '../errors/app-error.js';
import * as openingHoursRepo from '../repositories/opening-hours.repository.js';
import type { OpeningHour, SpecialHour } from '../types/domain.js';

export async function listOpeningHours(pool: Pool): Promise<OpeningHour[]> {
  return openingHoursRepo.findAllOpeningHours(pool);
}

export async function replaceOpeningHours(
  pool: Pool,
  input: ReplaceOpeningHoursInput,
): Promise<OpeningHour[]> {
  return openingHoursRepo.replaceOpeningHours(pool, input.entries);
}

export async function listSpecialHours(pool: Pool): Promise<SpecialHour[]> {
  return openingHoursRepo.findAllSpecialHours(pool);
}

export async function createSpecialHour(
  pool: Pool,
  input: CreateSpecialHourInput,
): Promise<SpecialHour> {
  const existing = await openingHoursRepo.findSpecialHourForDate(pool, input.businessDate);
  if (existing) {
    throw new ValidationError(
      `Für den ${input.businessDate} existiert bereits eine besondere Öffnungszeit.`,
    );
  }
  return openingHoursRepo.insertSpecialHour(pool, {
    businessDate: input.businessDate,
    isClosed: input.isClosed,
    opensAt: input.opensAt ?? null,
    closesAt: input.closesAt ?? null,
    label: input.label ?? null,
  });
}

export async function updateSpecialHour(
  pool: Pool,
  id: string,
  input: UpdateSpecialHourInput,
): Promise<SpecialHour> {
  const updated = await openingHoursRepo.updateSpecialHour(pool, id, input);
  if (!updated) {
    throw new NotFoundError('Besondere Öffnungszeit nicht gefunden.');
  }
  return updated;
}

export async function deleteSpecialHour(pool: Pool, id: string): Promise<void> {
  const deleted = await openingHoursRepo.deleteSpecialHour(pool, id);
  if (!deleted) {
    throw new NotFoundError('Besondere Öffnungszeit nicht gefunden.');
  }
}
