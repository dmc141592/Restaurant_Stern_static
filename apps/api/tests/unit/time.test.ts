import { describe, expect, it } from 'vitest';
import {
  AmbiguousLocalTimeError,
  NonExistentLocalTimeError,
  instantToLocalDate,
  instantToLocalTime,
  localDateTimeToInstant,
  weekdayOfLocalDate,
} from '../../src/utils/time.js';

const ZURICH = 'Europe/Zurich';

describe('localDateTimeToInstant', () => {
  it('converts a winter-time local date/time to the correct UTC instant (UTC+1)', () => {
    const instant = localDateTimeToInstant(ZURICH, '2026-01-15', '19:00');
    expect(instant.toUTC().toISO()).toBe('2026-01-15T18:00:00.000Z');
  });

  it('converts a summer-time local date/time to the correct UTC instant (UTC+2)', () => {
    const instant = localDateTimeToInstant(ZURICH, '2026-07-15', '19:00');
    expect(instant.toUTC().toISO()).toBe('2026-07-15T17:00:00.000Z');
  });

  it('round-trips back to the same local date and time', () => {
    const instant = localDateTimeToInstant(ZURICH, '2026-03-10', '12:30');
    expect(instantToLocalDate(ZURICH, instant)).toBe('2026-03-10');
    expect(instantToLocalTime(ZURICH, instant)).toBe('12:30');
  });

  it('rejects a local time that does not exist during the spring-forward gap', () => {
    // In 2026 Europe/Zurich switches to summer time on the last Sunday of
    // March (2026-03-29), jumping from 02:00 to 03:00 — 02:30 never happens.
    expect(() => localDateTimeToInstant(ZURICH, '2026-03-29', '02:30')).toThrow(
      NonExistentLocalTimeError,
    );
  });

  it('rejects a local time that is ambiguous during the autumn fall-back overlap', () => {
    // 2026 switches back to winter time on 2026-10-25, so 02:30 occurs twice.
    expect(() => localDateTimeToInstant(ZURICH, '2026-10-25', '02:30')).toThrow(
      AmbiguousLocalTimeError,
    );
  });

  it('accepts a local time shortly before the spring-forward gap', () => {
    expect(() => localDateTimeToInstant(ZURICH, '2026-03-29', '01:30')).not.toThrow();
  });

  it('accepts a local time shortly after the autumn fall-back overlap', () => {
    expect(() => localDateTimeToInstant(ZURICH, '2026-10-25', '03:30')).not.toThrow();
  });
});

describe('weekdayOfLocalDate', () => {
  it('maps Monday to 0 and Sunday to 6', () => {
    // 2026-08-17 is a Monday.
    expect(weekdayOfLocalDate(ZURICH, '2026-08-17')).toBe(0);
    // 2026-08-23 is a Sunday.
    expect(weekdayOfLocalDate(ZURICH, '2026-08-23')).toBe(6);
  });
});
