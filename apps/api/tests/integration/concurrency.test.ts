import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, getTestPool, resetDatabase, seedAlwaysOpenHours, seedArea } from './helpers/db.js';

let app: FastifyInstance;

function reservationPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    guestFirstName: 'Anna',
    guestLastName: 'Muster',
    guestEmail: 'anna@example.com',
    guestPhone: '+41791234567',
    partySize: 6,
    localDate: '2026-08-17',
    localTime: '19:00',
    privacyAccepted: true,
    ...overrides,
  };
}

describe('concurrent reservation requests (double-booking protection)', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('only lets one of two concurrent requests succeed when together they would exceed capacity', async () => {
    const areaId = await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 10 });
    await seedAlwaysOpenHours();

    const [responseA, responseB] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/public/reservations',
        payload: reservationPayload({ preferredAreaId: areaId, partySize: 6, guestEmail: 'a@example.com' }),
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/public/reservations',
        payload: reservationPayload({ preferredAreaId: areaId, partySize: 6, guestEmail: 'b@example.com' }),
      }),
    ]);

    const statusCodes = [responseA.statusCode, responseB.statusCode].sort();
    expect(statusCodes).toEqual([201, 409]);

    const pool = getTestPool();
    const { rows } = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(party_size), 0) AS total FROM reservations
       WHERE area_id = $1 AND status IN ('PENDING', 'CONFIRMED')`,
      [areaId],
    );
    expect(Number(rows[0]!.total)).toBeLessThanOrEqual(10);
  });

  it('only lets one of two concurrent requests succeed for the same exclusive room and time', async () => {
    const areaId = await seedArea({ slug: 'saeli', name: 'Säli', resourceMode: 'EXCLUSIVE', capacity: 50 });
    await seedAlwaysOpenHours();

    const [responseA, responseB] = await Promise.all([
      app.inject({
        method: 'POST',
        url: '/api/v1/public/reservations',
        payload: reservationPayload({ preferredAreaId: areaId, partySize: 10, guestEmail: 'a@example.com' }),
      }),
      app.inject({
        method: 'POST',
        url: '/api/v1/public/reservations',
        payload: reservationPayload({ preferredAreaId: areaId, partySize: 12, guestEmail: 'b@example.com' }),
      }),
    ]);

    const statusCodes = [responseA.statusCode, responseB.statusCode].sort();
    expect(statusCodes).toEqual([201, 409]);

    const pool = getTestPool();
    const { rows } = await pool.query(
      `SELECT COUNT(*) AS count FROM exclusive_reservation_allocations WHERE area_id = $1 AND is_blocking = TRUE`,
      [areaId],
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it('lets exactly five of eight concurrent 1-person requests succeed against a capacity of five', async () => {
    // Kept under the public reservation endpoint's own rate limit (10/min)
    // so this test exercises the capacity race, not the rate limiter.
    const areaId = await seedArea({ slug: 'bar', name: 'Treichle Bar', resourceMode: 'CAPACITY', capacity: 5 });
    await seedAlwaysOpenHours();

    const responses = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        app.inject({
          method: 'POST',
          url: '/api/v1/public/reservations',
          payload: reservationPayload({
            preferredAreaId: areaId,
            partySize: 1,
            guestEmail: `guest-${index}@example.com`,
          }),
        }),
      ),
    );

    const successCount = responses.filter((response) => response.statusCode === 201).length;
    expect(successCount).toBe(5);
  });
});
