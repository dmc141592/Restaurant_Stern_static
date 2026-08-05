import type { DateTime } from 'luxon';
import type { AppConfig } from '../config/index.js';
import type { DbClient } from '../db/client.js';
import {
  AreaNotBookableError,
  AvailabilityConflictError,
  OutsideOpeningHoursError,
  ValidationError,
} from '../errors/app-error.js';
import * as areasRepo from '../repositories/areas.repository.js';
import * as blocksRepo from '../repositories/blocks.repository.js';
import * as bookingSettingsRepo from '../repositories/booking-settings.repository.js';
import * as exclusiveAllocationsRepo from '../repositories/exclusive-allocations.repository.js';
import * as openingHoursRepo from '../repositories/opening-hours.repository.js';
import * as reservationsRepo from '../repositories/reservations.repository.js';
import type { Area } from '../types/domain.js';
import {
  AmbiguousLocalTimeError,
  NonExistentLocalTimeError,
  localDateTimeToInstant,
  nowInstant,
  toIso,
  weekdayOfLocalDate,
} from '../utils/time.js';

export const FALLBACK_DURATION_MINUTES = 120;

export interface AvailabilityQuery {
  localDate: string;
  localTime: string;
  partySize: number;
  preferredAreaId?: string;
}

export interface AreaCandidate {
  area: Area;
  endsAt: Date;
  availableCapacity: number;
}

export interface AvailabilitySnapshot {
  startInstant: DateTime;
  durationMinutes: number;
  recommendation: AreaCandidate | null;
  alternatives: AreaCandidate[];
}

export function resolveStartInstant(zone: string, localDate: string, localTime: string): DateTime {
  try {
    return localDateTimeToInstant(zone, localDate, localTime);
  } catch (error) {
    if (error instanceof NonExistentLocalTimeError || error instanceof AmbiguousLocalTimeError) {
      throw new ValidationError(error.message);
    }
    throw error;
  }
}

export async function assertWithinBookingHorizon(
  client: DbClient,
  startInstant: DateTime,
): Promise<void> {
  const settings = await bookingSettingsRepo.getBookingSettings(client);
  const now = nowInstant();
  const earliest = now.plus({ minutes: settings.minAdvanceMinutes });
  const latest = now.plus({ days: settings.maxAdvanceDays });

  if (startInstant < earliest) {
    throw new ValidationError(
      `Reservationen müssen mindestens ${settings.minAdvanceMinutes} Minuten im Voraus erfolgen.`,
    );
  }
  if (startInstant > latest) {
    throw new ValidationError(
      `Reservationen können höchstens ${settings.maxAdvanceDays} Tage im Voraus erfolgen.`,
    );
  }
}

export async function isWithinOpeningHours(
  client: DbClient,
  zone: string,
  localDate: string,
  localTime: string,
): Promise<boolean> {
  const special = await openingHoursRepo.findSpecialHourForDate(client, localDate);
  if (special) {
    if (special.isClosed) {
      return false;
    }
    return special.opensAt !== null && special.closesAt !== null
      ? special.opensAt <= localTime && localTime < special.closesAt
      : false;
  }

  const weekday = weekdayOfLocalDate(zone, localDate);
  const hours = await openingHoursRepo.findOpeningHoursForWeekday(client, weekday);
  return hours.some((entry) => entry.opensAt <= localTime && localTime < entry.closesAt);
}

function sumBlockedCapacity(
  blocks: Array<{ blockedCapacity: number | null }>,
  areaCapacity: number,
): number {
  const sum = blocks.reduce((total, block) => total + (block.blockedCapacity ?? areaCapacity), 0);
  return Math.min(sum, areaCapacity);
}

export async function computeAreaAvailableCapacity(
  client: DbClient,
  area: Area,
  startsAt: Date,
  endsAt: Date,
  excludeReservationId?: string,
): Promise<number> {
  const blocks = await blocksRepo.findOverlappingBlocks(client, area.id, startsAt, endsAt);

  if (area.resourceMode === 'EXCLUSIVE') {
    if (blocks.length > 0) {
      return 0;
    }
    const occupied = await exclusiveAllocationsRepo.hasBlockingExclusiveOverlap(
      client,
      area.id,
      startsAt,
      endsAt,
    );
    return occupied ? 0 : area.capacity;
  }

  const blockedCapacity = sumBlockedCapacity(blocks, area.capacity);
  const reservedPartySize = await reservationsRepo.sumOverlappingBlockingPartySize(
    client,
    area.id,
    startsAt,
    endsAt,
    excludeReservationId,
  );
  return Math.max(0, area.capacity - blockedCapacity - reservedPartySize);
}

/**
 * Deterministic recommendation rule (see brief section 5): among areas with
 * enough free capacity, prefer the one that leaves the *least* leftover
 * capacity after the party is seated — this reduces capacity fragmentation
 * without any speculative optimisation. Ties are broken by admin-configured
 * sort order, then by name, so the result is stable and testable.
 */
export function pickBestCandidate(
  candidates: AreaCandidate[],
  partySize: number,
): AreaCandidate | null {
  const fitting = candidates.filter((candidate) => candidate.availableCapacity >= partySize);
  if (fitting.length === 0) {
    return null;
  }
  const sorted = [...fitting].sort((a, b) => {
    const leftoverA = a.availableCapacity - partySize;
    const leftoverB = b.availableCapacity - partySize;
    if (leftoverA !== leftoverB) {
      return leftoverA - leftoverB;
    }
    if (a.area.sortOrder !== b.area.sortOrder) {
      return a.area.sortOrder - b.area.sortOrder;
    }
    return a.area.name.localeCompare(b.area.name, 'de-CH');
  });
  return sorted[0]!;
}

async function buildCandidates(
  client: DbClient,
  areas: Area[],
  startInstant: DateTime,
): Promise<AreaCandidate[]> {
  const candidates: AreaCandidate[] = [];
  for (const area of areas) {
    const endsAt = startInstant.plus({ minutes: area.defaultDurationMinutes }).toJSDate();
    const startsAt = startInstant.toJSDate();
    const availableCapacity = await computeAreaAvailableCapacity(client, area, startsAt, endsAt);
    candidates.push({ area, endsAt, availableCapacity });
  }
  return candidates;
}

/** Read-only snapshot used by the public GET /availability endpoint. */
export async function computeAvailabilitySnapshot(
  client: DbClient,
  config: AppConfig,
  query: AvailabilityQuery,
): Promise<AvailabilitySnapshot> {
  const startInstant = resolveStartInstant(config.businessTimeZone, query.localDate, query.localTime);
  await assertWithinBookingHorizon(client, startInstant);

  const openNow = await isWithinOpeningHours(
    client,
    config.businessTimeZone,
    query.localDate,
    query.localTime,
  );
  if (!openNow) {
    return {
      startInstant,
      durationMinutes: FALLBACK_DURATION_MINUTES,
      recommendation: null,
      alternatives: [],
    };
  }

  const areas = await areasRepo.findActiveOnlineBookableAreas(client);
  const candidates = await buildCandidates(client, areas, startInstant);
  const fitting = candidates.filter((c) => c.availableCapacity >= query.partySize);
  const recommendation = pickBestCandidate(fitting, query.partySize);
  const alternatives = fitting.filter((c) => c.area.id !== recommendation?.area.id);

  return {
    startInstant,
    durationMinutes: recommendation?.area.defaultDurationMinutes ?? FALLBACK_DURATION_MINUTES,
    recommendation,
    alternatives,
  };
}

export function toAvailabilityResponseDto(snapshot: AvailabilitySnapshot): {
  requestedStart: string;
  durationMinutes: number;
  recommendation: { areaId: string; areaName: string; availableCapacity: number } | null;
  alternatives: Array<{ areaId: string; areaName: string; availableCapacity: number }>;
} {
  return {
    requestedStart: toIso(snapshot.startInstant),
    durationMinutes: snapshot.durationMinutes,
    recommendation: snapshot.recommendation
      ? {
          areaId: snapshot.recommendation.area.id,
          areaName: snapshot.recommendation.area.name,
          availableCapacity: snapshot.recommendation.availableCapacity,
        }
      : null,
    alternatives: snapshot.alternatives.map((c) => ({
      areaId: c.area.id,
      areaName: c.area.name,
      availableCapacity: c.availableCapacity,
    })),
  };
}

/**
 * Authoritative re-check performed *inside* the reservation-creation
 * transaction, after the per-area advisory lock has been acquired. This is
 * the check that actually prevents double-booking; the GET endpoint above is
 * only ever a best-effort preview.
 */
export async function assertAreaAvailableForBooking(
  client: DbClient,
  config: AppConfig,
  areaId: string,
  startInstant: DateTime,
  partySize: number,
  excludeReservationId?: string,
): Promise<{ area: Area; endsAt: Date }> {
  const area = await areasRepo.findAreaById(client, areaId);
  if (!area || !area.isActive || !area.isOnlineBookable) {
    throw new AreaNotBookableError('Der gewählte Bereich ist aktuell nicht online buchbar.');
  }

  const localDate = startInstant.setZone(config.businessTimeZone).toFormat('yyyy-MM-dd');
  const localTime = startInstant.setZone(config.businessTimeZone).toFormat('HH:mm');
  const openNow = await isWithinOpeningHours(client, config.businessTimeZone, localDate, localTime);
  if (!openNow) {
    throw new OutsideOpeningHoursError('Zu diesem Zeitpunkt hat das Restaurant geschlossen.');
  }

  const startsAt = startInstant.toJSDate();
  const endsAt = startInstant.plus({ minutes: area.defaultDurationMinutes }).toJSDate();
  const availableCapacity = await computeAreaAvailableCapacity(
    client,
    area,
    startsAt,
    endsAt,
    excludeReservationId,
  );

  if (availableCapacity < partySize) {
    throw new AvailabilityConflictError(
      'Der gewählte Bereich ist zu diesem Zeitpunkt nicht mehr verfügbar.',
      { availableCapacity },
    );
  }

  return { area, endsAt };
}
