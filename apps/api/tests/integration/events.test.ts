import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, resetDatabase, seedAlwaysOpenHours, seedArea } from './helpers/db.js';
import { loginAsAdmin } from './helpers/auth.js';

let app: FastifyInstance;

describe('events with area blocking', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('publishing an event that blocks an area removes that area from public availability during the event', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 200 });
    const headers = await loginAsAdmin(app);

    const beforeEventAvailability = await app.inject({
      method: 'GET',
      url: `/api/v1/public/availability?date=2026-09-05&time=19:00&partySize=10`,
    });
    expect(beforeEventAvailability.json().recommendation?.areaId).toBe(areaId);

    const createEvent = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/events',
      headers,
      payload: {
        slug: 'jazz-abend',
        title: 'Jazz-Abend',
        summary: 'Live-Musik im Garten',
        startDate: '2026-09-05',
        startTime: '18:00',
        endDate: '2026-09-05',
        endTime: '23:00',
        areaIds: [areaId],
        blockAreas: true,
      },
    });
    expect(createEvent.statusCode).toBe(201);

    const duringEventAvailability = await app.inject({
      method: 'GET',
      url: `/api/v1/public/availability?date=2026-09-05&time=19:00&partySize=10`,
    });
    expect(duringEventAvailability.json().recommendation).toBeNull();

    const blocksAfterCreate = await app.pool.query("SELECT * FROM availability_blocks WHERE block_type = 'PRIVATE_EVENT'");
    expect(blocksAfterCreate.rowCount).toBe(1);

    // Deleting the event must not leave the block behind (brief section 14).
    const eventId = createEvent.json().id as string;
    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/admin/events/${eventId}`,
      headers,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const blocksAfterDelete = await app.pool.query("SELECT * FROM availability_blocks WHERE block_type = 'PRIVATE_EVENT'");
    expect(blocksAfterDelete.rowCount).toBe(0);

    const afterDeleteAvailability = await app.inject({
      method: 'GET',
      url: `/api/v1/public/availability?date=2026-09-05&time=19:00&partySize=10`,
    });
    expect(afterDeleteAvailability.json().recommendation?.areaId).toBe(areaId);
  });

  it('only exposes published events on the public events endpoint', async () => {
    const headers = await loginAsAdmin(app);

    await app.inject({
      method: 'POST',
      url: '/api/v1/admin/events',
      headers,
      payload: {
        slug: 'unveroeffentlicht',
        title: 'Geheimes Event',
        summary: 'Noch nicht sichtbar',
        startDate: '2026-09-10',
        startTime: '18:00',
        endDate: '2026-09-10',
        endTime: '22:00',
        areaIds: [],
        blockAreas: false,
      },
    });

    const publicList = await app.inject({ method: 'GET', url: '/api/v1/public/events' });
    expect(publicList.json()).toEqual([]);
  });
});
