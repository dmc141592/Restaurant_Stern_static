import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, getTestPool, resetDatabase, seedAlwaysOpenHours, seedArea } from './helpers/db.js';
import { createApiKey, revokeApiKey } from '../../src/services/api-keys.service.js';
import { buildTestConfig } from '../fixtures/test-config.js';

let app: FastifyInstance;

async function createReservations(areaId: string, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: {
        guestFirstName: 'Gast',
        guestLastName: `Nummer${index}`,
        guestEmail: `gast${index}@example.com`,
        guestPhone: '+41791234567',
        partySize: 2,
        localDate: '2026-08-17',
        localTime: '19:00',
        preferredAreaId: areaId,
        privacyAccepted: true,
      },
    });
    expect(response.statusCode).toBe(201);
  }
}

describe('POS integration API (API-key protected reservation export)', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('rejects requests without a valid API key', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations',
      headers: { authorization: 'Bearer not-a-real-key' },
    });
    expect(response.statusCode).toBe(401);
  });

  it('accepts requests with a valid API key and returns the POS-shaped payload', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    await createReservations(areaId, 1);

    const { plaintextKey } = await createApiKey(getTestPool(), buildTestConfig(), 'Test-Kasse');

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations',
      headers: { authorization: `Bearer ${plaintextKey}` },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toHaveProperty('guest');
    expect(body.data[0].guest).toHaveProperty('email');
    expect(body.data[0]).not.toHaveProperty('statusLabel');

    const exportLog = await getTestPool().query('SELECT * FROM pos_export_log');
    expect(exportLog.rowCount).toBe(1);
  });

  it('rejects a revoked API key', async () => {
    const { plaintextKey, prefix } = await createApiKey(getTestPool(), buildTestConfig(), 'Test-Kasse');
    await revokeApiKey(getTestPool(), prefix);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/reservations',
      headers: { authorization: `Bearer ${plaintextKey}` },
    });
    expect(response.statusCode).toBe(401);
  });

  it('paginates results with an opaque cursor, without duplicates or omissions', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    await createReservations(areaId, 5);
    const { plaintextKey } = await createApiKey(getTestPool(), buildTestConfig(), 'Test-Kasse');

    const seenIds = new Set<string>();
    let cursor: string | null = null;

    for (let pages = 0; pages < 10; pages += 1) {
      const query = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/reservations?limit=2${query}`,
        headers: { authorization: `Bearer ${plaintextKey}` },
      });
      expect(response.statusCode).toBe(200);
      const body: { data: Array<{ id: string }>; pagination: { nextCursor: string | null } } = response.json();
      for (const row of body.data) {
        expect(seenIds.has(row.id)).toBe(false);
        seenIds.add(row.id);
      }
      cursor = body.pagination.nextCursor;
      if (!cursor) {
        break;
      }
    }

    expect(seenIds.size).toBe(5);
  });
});
