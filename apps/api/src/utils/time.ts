import { DateTime } from 'luxon';

/**
 * Central place for all local-time <-> absolute-instant conversions.
 * Everything here is built on Luxon's IANA timezone data (via Intl), never
 * on hand-rolled DST arithmetic. Weekday convention: 0 = Montag ... 6 = Sonntag
 * (matches the `opening_hours.weekday` column).
 */

export class NonExistentLocalTimeError extends Error {
  constructor(localDate: string, localTime: string) {
    super(
      `Die Uhrzeit ${localTime} existiert am ${localDate} nicht, da an diesem Tag die Uhr ` +
        'wegen der Zeitumstellung vorgestellt wird. Bitte eine andere Uhrzeit wählen.',
    );
    this.name = 'NonExistentLocalTimeError';
  }
}

export class AmbiguousLocalTimeError extends Error {
  constructor(localDate: string, localTime: string) {
    super(
      `Die Uhrzeit ${localTime} am ${localDate} ist wegen der Zeitumstellung mehrdeutig ` +
        '(sie kommt an diesem Tag zweimal vor). Bitte eine andere Uhrzeit wählen.',
    );
    this.name = 'AmbiguousLocalTimeError';
  }
}

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function parseLocalDateTime(localDate: string, localTime: string): WallTime {
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute] = localTime.split(':').map(Number);
  return { year: year!, month: month!, day: day!, hour: hour!, minute: minute! };
}

function dstDeltaMinutes(zone: string, year: number): number {
  const summer = DateTime.fromObject({ year, month: 7, day: 1, hour: 12 }, { zone });
  const winter = DateTime.fromObject({ year, month: 1, day: 1, hour: 12 }, { zone });
  return Math.abs(summer.offset - winter.offset);
}

/**
 * Converts a local wall-clock date/time (as entered by a guest or admin) in
 * `zone` into an absolute instant. Rejects local times that do not exist
 * (spring-forward gap) and local times that are ambiguous (fall-back
 * overlap) with a clear, user-facing error rather than silently guessing.
 */
export function localDateTimeToInstant(
  zone: string,
  localDate: string,
  localTime: string,
): DateTime {
  const wall = parseLocalDateTime(localDate, localTime);
  const candidate = DateTime.fromObject(
    { year: wall.year, month: wall.month, day: wall.day, hour: wall.hour, minute: wall.minute },
    { zone },
  );

  if (!candidate.isValid) {
    throw new Error(`Ungültiges lokales Datum/Zeit: ${candidate.invalidReason}`);
  }

  const roundTripMatches =
    candidate.year === wall.year &&
    candidate.month === wall.month &&
    candidate.day === wall.day &&
    candidate.hour === wall.hour &&
    candidate.minute === wall.minute;

  if (!roundTripMatches) {
    throw new NonExistentLocalTimeError(localDate, localTime);
  }

  // Ambiguity (fall-back overlap) means the same wall clock maps to two UTC
  // instants exactly `delta` minutes apart. `fromObject` above already
  // resolved `candidate` to *one* of them; regardless of which one Luxon
  // picked, shifting by +delta or -delta and re-checking the wall clock in
  // the target zone will land back on the same requested local time only if
  // the *other* occurrence also exists — i.e. only if it was ambiguous.
  const delta = dstDeltaMinutes(zone, wall.year);
  if (delta > 0) {
    const wallClockMatches = (shifted: DateTime): boolean =>
      shifted.year === wall.year &&
      shifted.month === wall.month &&
      shifted.day === wall.day &&
      shifted.hour === wall.hour &&
      shifted.minute === wall.minute;

    const isAmbiguous =
      wallClockMatches(candidate.plus({ minutes: delta })) ||
      wallClockMatches(candidate.minus({ minutes: delta }));
    if (isAmbiguous) {
      throw new AmbiguousLocalTimeError(localDate, localTime);
    }
  }

  return candidate;
}

export function instantToLocalDate(zone: string, instant: DateTime): string {
  return instant.setZone(zone).toFormat('yyyy-MM-dd');
}

export function instantToLocalTime(zone: string, instant: DateTime): string {
  return instant.setZone(zone).toFormat('HH:mm');
}

export function instantToLocalDateTimeLabel(zone: string, instant: DateTime): string {
  return instant.setZone(zone).toFormat("dd.MM.yyyy 'um' HH:mm 'Uhr'");
}

export function weekdayOfLocalDate(zone: string, localDate: string): number {
  const [year, month, day] = localDate.split('-').map(Number);
  const dt = DateTime.fromObject({ year, month, day }, { zone });
  // Luxon's `.weekday` is 1 (Monday) .. 7 (Sunday); our convention is 0..6.
  return dt.weekday - 1;
}

export function toIso(instant: DateTime): string {
  const iso = instant.toUTC().toISO();
  if (!iso) {
    throw new Error('Konnte Zeitstempel nicht in ISO-8601 umwandeln.');
  }
  return iso;
}

export function fromIso(iso: string): DateTime {
  const dt = DateTime.fromISO(iso, { setZone: true });
  if (!dt.isValid) {
    throw new Error(`Ungültiger ISO-8601 Zeitstempel: ${iso}`);
  }
  return dt;
}

export function nowInstant(): DateTime {
  return DateTime.utc();
}
