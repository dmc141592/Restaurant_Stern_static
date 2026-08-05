import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, getTestPool, resetDatabase, seedAlwaysOpenHours, seedArea } from './helpers/db.js';
import type { FakeNotificationProvider } from '../fixtures/fake-notification-provider.js';

let app: FastifyInstance;
let provider: FakeNotificationProvider;

function reservationPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    guestFirstName: 'Anna',
    guestLastName: 'Muster',
    guestEmail: 'anna@example.com',
    guestPhone: '+41791234567',
    partySize: 4,
    localDate: '2026-08-17',
    localTime: '19:00',
    privacyAccepted: true,
    ...overrides,
  };
}

describe('POST /api/v1/public/reservations', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
    provider = built.provider;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('creates a PENDING reservation in a capacity-based area with enough room', async () => {
    await seedAlwaysOpenHours();
    await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload(),
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.reservation.status).toBe('PENDING');
    expect(body.reservation.statusLabel).toBe('Eingegangen');
    expect(body.reservation.area.name).toBe('Restaurant');
    expect(body.reservation.reference).toMatch(/^STERNEN-\d{4}-[0-9A-F]{6}$/);

    // Both the restaurant-facing and guest-facing outbox emails were queued
    // and the API attempted immediate best-effort delivery.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(provider.sent.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects a reservation outside opening hours with a clear error', async () => {
    // Intentionally no opening_hours seeded -> the restaurant is "closed" every day.
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId }),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('rejects a reservation on a day fully blocked for all areas', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const db = getTestPool();
    await db.query(
      `INSERT INTO availability_blocks (area_id, block_type, title, starts_at, ends_at)
       VALUES (NULL, 'CLOSURE', 'Betriebsferien', '2026-08-17T00:00:00Z', '2026-08-18T00:00:00Z')`,
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId }),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('AVAILABILITY_CONFLICT');
  });

  it('rejects a reservation in a specifically blocked area', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'saeli', name: 'Säli', resourceMode: 'EXCLUSIVE', capacity: 50 });
    const db = getTestPool();
    await db.query(
      `INSERT INTO availability_blocks (area_id, block_type, title, starts_at, ends_at)
       VALUES ($1, 'PRIVATE_EVENT', 'Firmenanlass', '2026-08-17T00:00:00Z', '2026-08-18T00:00:00Z')`,
      [areaId],
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 10 }),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('AVAILABILITY_CONFLICT');
  });

  it('rejects a reservation in an area that is not online-bookable', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({
      slug: 'jaegerstuebli',
      name: 'Jägerstübli',
      resourceMode: 'EXCLUSIVE',
      capacity: 20,
      isOnlineBookable: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId }),
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error.code).toBe('AREA_NOT_BOOKABLE');
  });

  it('accepts a second reservation in a capacity area when enough room remains', async () => {
    await seedAlwaysOpenHours();
    await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 20 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ partySize: 10, guestEmail: 'first@example.com' }),
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ partySize: 8, guestEmail: 'second@example.com' }),
    });
    expect(second.statusCode).toBe(201);
  });

  it('rejects a reservation in a capacity area once it would exceed capacity, and offers alternatives', async () => {
    await seedAlwaysOpenHours();
    await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 20 });
    await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ partySize: 15, guestEmail: 'first@example.com', preferredAreaId: undefined }),
    });
    expect(first.statusCode).toBe(201);
    const firstAreaId = first.json().reservation.area.id;

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({
        partySize: 10,
        guestEmail: 'second@example.com',
        preferredAreaId: firstAreaId,
      }),
    });

    expect(second.statusCode).toBe(409);
    const body = second.json();
    expect(body.error.code).toBe('AVAILABILITY_CONFLICT');
    expect(Array.isArray(body.error.details?.alternatives)).toBe(true);
  });

  it('rejects an overlapping reservation in an exclusive room', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'saeli', name: 'Säli', resourceMode: 'EXCLUSIVE', capacity: 50 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 12, guestEmail: 'first@example.com' }),
    });
    expect(first.statusCode).toBe(201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 5, guestEmail: 'second@example.com' }),
    });

    expect(second.statusCode).toBe(409);
    expect(second.json().error.code).toBe('AVAILABILITY_CONFLICT');
  });

  it('allows booking an exclusive room again once the first reservation ends before the new one starts', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'saeli', name: 'Säli', resourceMode: 'EXCLUSIVE', capacity: 50 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({
        preferredAreaId: areaId,
        localTime: '12:00',
        guestEmail: 'first@example.com',
      }),
    });
    expect(first.statusCode).toBe(201);

    // Default duration is 120 minutes, so the first booking ends at 14:00 —
    // a booking starting exactly then must succeed (half-open interval).
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({
        preferredAreaId: areaId,
        localTime: '14:00',
        guestEmail: 'second@example.com',
      }),
    });
    expect(second.statusCode).toBe(201);
  });
});
