import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, resetDatabase, seedAlwaysOpenHours, seedArea } from './helpers/db.js';
import { loginAsAdmin } from './helpers/auth.js';

let app: FastifyInstance;

describe('admin availability blocks (Sperrungen)', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('creates a block for a single area with no existing reservations', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'saeli', name: 'Säli', resourceMode: 'EXCLUSIVE', capacity: 50 });
    const headers = await loginAsAdmin(app);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/blocks',
      headers,
      payload: {
        areaId,
        blockType: 'MAINTENANCE',
        title: 'Bodenschleifen',
        startDate: '2026-09-01',
        startTime: '00:00',
        endDate: '2026-09-02',
        endTime: '00:00',
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().title).toBe('Bodenschleifen');
  });

  it('warns about conflicting reservations instead of silently blocking them', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const headers = await loginAsAdmin(app);

    const reservationResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: {
        guestFirstName: 'Anna',
        guestLastName: 'Muster',
        guestEmail: 'anna@example.com',
        guestPhone: '+41791234567',
        partySize: 4,
        localDate: '2026-09-01',
        localTime: '19:00',
        preferredAreaId: areaId,
        privacyAccepted: true,
      },
    });
    expect(reservationResponse.statusCode).toBe(201);

    const blockAttempt = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/blocks',
      headers,
      payload: {
        areaId,
        blockType: 'CLOSURE',
        title: 'Ganzer Tag geschlossen',
        startDate: '2026-09-01',
        startTime: '00:00',
        endDate: '2026-09-02',
        endTime: '00:00',
      },
    });
    expect(blockAttempt.statusCode).toBe(409);
    expect(blockAttempt.json().error.code).toBe('BLOCK_CONFLICT');
    expect(blockAttempt.json().error.details.conflicts.length).toBe(1);

    // The reservation itself must still exist, untouched.
    const stillThere = await app.pool.query('SELECT status FROM reservations');
    expect(stillThere.rows[0]!.status).toBe('PENDING');

    const acknowledged = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/blocks',
      headers,
      payload: {
        areaId,
        blockType: 'CLOSURE',
        title: 'Ganzer Tag geschlossen',
        startDate: '2026-09-01',
        startTime: '00:00',
        endDate: '2026-09-02',
        endTime: '00:00',
        acknowledgeConflicts: true,
      },
    });
    expect(acknowledged.statusCode).toBe(201);
  });
});
