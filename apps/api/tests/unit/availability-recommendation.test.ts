import { describe, expect, it } from 'vitest';
import { pickBestCandidate, type AreaCandidate } from '../../src/services/availability.service.js';
import type { Area } from '../../src/types/domain.js';

function makeArea(overrides: Partial<Area>): Area {
  return {
    id: overrides.id ?? 'area-id',
    slug: overrides.slug ?? 'slug',
    name: overrides.name ?? 'Bereich',
    description: null,
    resourceMode: 'CAPACITY',
    capacity: overrides.capacity ?? 100,
    defaultDurationMinutes: 120,
    slotIntervalMinutes: 30,
    isActive: true,
    isOnlineBookable: true,
    sortOrder: overrides.sortOrder ?? 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCandidate(overrides: {
  id: string;
  name: string;
  availableCapacity: number;
  sortOrder?: number;
}): AreaCandidate {
  return {
    area: makeArea({ id: overrides.id, name: overrides.name, sortOrder: overrides.sortOrder ?? 0 }),
    endsAt: new Date(),
    availableCapacity: overrides.availableCapacity,
  };
}

describe('pickBestCandidate', () => {
  it('returns null when no area has enough capacity', () => {
    const candidates = [
      makeCandidate({ id: '1', name: 'Restaurant', availableCapacity: 2 }),
      makeCandidate({ id: '2', name: 'Garten', availableCapacity: 3 }),
    ];
    expect(pickBestCandidate(candidates, 10)).toBeNull();
  });

  it('prefers the area with the least leftover capacity after seating the party', () => {
    const candidates = [
      makeCandidate({ id: '1', name: 'Restaurant', availableCapacity: 24 }),
      makeCandidate({ id: '2', name: 'Garten', availableCapacity: 80 }),
      makeCandidate({ id: '3', name: 'Treichle Bar', availableCapacity: 10 }),
    ];
    // Party of 4: leftovers are 20 (Restaurant), 76 (Garten), 6 (Treichle Bar) -> Treichle Bar wins.
    const winner = pickBestCandidate(candidates, 4);
    expect(winner?.area.id).toBe('3');
  });

  it('breaks ties by the admin-configured sort order', () => {
    const candidates = [
      makeCandidate({ id: '1', name: 'B', availableCapacity: 10, sortOrder: 2 }),
      makeCandidate({ id: '2', name: 'A', availableCapacity: 10, sortOrder: 1 }),
    ];
    const winner = pickBestCandidate(candidates, 4);
    expect(winner?.area.id).toBe('2');
  });

  it('breaks remaining ties by name for a fully deterministic result', () => {
    const candidates = [
      makeCandidate({ id: '1', name: 'Zebra', availableCapacity: 10, sortOrder: 1 }),
      makeCandidate({ id: '2', name: 'Amsel', availableCapacity: 10, sortOrder: 1 }),
    ];
    const winner = pickBestCandidate(candidates, 4);
    expect(winner?.area.id).toBe('2');
  });

  it('excludes areas that do not fit even if they have the smallest leftover among all candidates', () => {
    const candidates = [
      makeCandidate({ id: '1', name: 'Jägerstübli', availableCapacity: 5 }),
      makeCandidate({ id: '2', name: 'Restaurant', availableCapacity: 30 }),
    ];
    const winner = pickBestCandidate(candidates, 8);
    expect(winner?.area.id).toBe('2');
  });
});
