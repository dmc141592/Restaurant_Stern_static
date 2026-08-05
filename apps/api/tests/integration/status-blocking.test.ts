import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import {
  closeTestPool,
  getTestPool,
  resetDatabase,
  seedAlwaysOpenHours,
  seedArea,
} from './helpers/db.js';
import { buildTestConfig } from '../fixtures/test-config.js';
import { FakeNotificationProvider } from '../fixtures/fake-notification-provider.js';
import {
  cancelReservation,
  confirmReservation,
  rejectReservation,
} from '../../src/services/reservation.service.js';

let app: FastifyInstance;

function reservationPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    guestFirstName: 'Anna',
    guestLastName: 'Muster',
    guestEmail: 'anna@example.com',
    guestPhone: '+41791234567',
    partySize: 12,
    localDate: '2026-08-17',
    localTime: '19:00',
    privacyAccepted: true,
    ...overrides,
  };
}

describe('reservation status and capacity release', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('PENDING reservations block capacity for later online requests', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 20 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 15, guestEmail: 'a@example.com' }),
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().reservation.status).toBe('PENDING');

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 10, guestEmail: 'b@example.com' }),
    });
    expect(second.statusCode).toBe(409);
  });

  it('CONFIRMED reservations continue to block capacity', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 20 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 15, guestEmail: 'a@example.com' }),
    });
    const reservationId = first.json().reservation as { reference: string };
    const pool = getTestPool();
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM reservations WHERE public_reference = $1', [
      reservationId.reference,
    ]);

    await confirmReservation(
      pool,
      buildTestConfig(),
      new FakeNotificationProvider(),
      { info: () => {}, warn: () => {}, error: () => {} },
      rows[0]!.id,
      { type: 'ADMIN', reference: 'test-admin@example.com' },
    );

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 10, guestEmail: 'b@example.com' }),
    });
    expect(second.statusCode).toBe(409);
  });

  it('REJECTED reservations free their capacity again', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 20 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 15, guestEmail: 'a@example.com' }),
    });
    const pool = getTestPool();
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM reservations WHERE public_reference = $1', [
      first.json().reservation.reference,
    ]);

    await rejectReservation(
      pool,
      buildTestConfig(),
      new FakeNotificationProvider(),
      { info: () => {}, warn: () => {}, error: () => {} },
      rows[0]!.id,
      { type: 'ADMIN', reference: 'test-admin@example.com' },
      null,
    );

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 10, guestEmail: 'b@example.com' }),
    });
    expect(second.statusCode).toBe(201);
  });

  it('CANCELLED reservations free their capacity again', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 20 });

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 15, guestEmail: 'a@example.com' }),
    });
    const pool = getTestPool();
    const { rows } = await pool.query<{ id: string }>('SELECT id FROM reservations WHERE public_reference = $1', [
      first.json().reservation.reference,
    ]);

    await cancelReservation(
      pool,
      buildTestConfig(),
      new FakeNotificationProvider(),
      { info: () => {}, warn: () => {}, error: () => {} },
      rows[0]!.id,
      { type: 'ADMIN', reference: 'test-admin@example.com' },
    );

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/public/reservations',
      payload: reservationPayload({ preferredAreaId: areaId, partySize: 10, guestEmail: 'b@example.com' }),
    });
    expect(second.statusCode).toBe(201);
  });
});
