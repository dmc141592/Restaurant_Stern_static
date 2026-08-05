import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, resetDatabase, seedAlwaysOpenHours, seedArea } from './helpers/db.js';

let app: FastifyInstance;

async function createPendingReservation(areaId: string): Promise<{ confirmToken: string; rejectToken: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/public/reservations',
    payload: {
      guestFirstName: 'Anna',
      guestLastName: 'Muster',
      guestEmail: 'anna@example.com',
      guestPhone: '+41791234567',
      partySize: 4,
      localDate: '2026-08-17',
      localTime: '19:00',
      preferredAreaId: areaId,
      privacyAccepted: true,
    },
  });
  expect(response.statusCode).toBe(201);

  // The outbox row for the restaurant email holds the plaintext action URLs;
  // extract the tokens the same way a staff member clicking the email would.
  const outbox = await app.pool.query<{ template_data: { confirmUrl: string; rejectUrl: string } }>(
    `SELECT template_data FROM notification_outbox WHERE notification_type = 'RESTAURANT_NEW_RESERVATION' ORDER BY created_at DESC LIMIT 1`,
  );
  const { confirmUrl, rejectUrl } = outbox.rows[0]!.template_data;
  return {
    confirmToken: confirmUrl.split('/').pop()!,
    rejectToken: rejectUrl.split('/').pop()!,
  };
}

describe('reservation action tokens (email confirm/reject links)', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('a GET on the confirm link only previews the reservation without changing its status', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const { confirmToken } = await createPendingReservation(areaId);

    const preview = await app.inject({ method: 'GET', url: `/api/v1/reservation-actions/${confirmToken}` });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().reservation.status).toBe('PENDING');
    expect(preview.json().action).toBe('CONFIRM');

    const stillPending = await app.pool.query<{ status: string }>(
      `SELECT status FROM reservations WHERE public_reference = $1`,
      [preview.json().reservation.reference],
    );
    expect(stillPending.rows[0]!.status).toBe('PENDING');
  });

  it('confirms a reservation via POST on the confirm link', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const { confirmToken } = await createPendingReservation(areaId);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/reservation-actions/${confirmToken}/confirm`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().reservation.status).toBe('CONFIRMED');
  });

  it('rejects a reservation via POST on the reject link', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const { rejectToken } = await createPendingReservation(areaId);

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/reservation-actions/${rejectToken}/reject`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().reservation.status).toBe('REJECTED');
  });

  it('answers a repeated confirm on an already-used token idempotently instead of erroring', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const { confirmToken } = await createPendingReservation(areaId);

    const firstConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/reservation-actions/${confirmToken}/confirm`,
    });
    expect(firstConfirm.statusCode).toBe(200);

    const secondConfirm = await app.inject({
      method: 'POST',
      url: `/api/v1/reservation-actions/${confirmToken}/confirm`,
    });
    expect(secondConfirm.statusCode).toBe(200);
    expect(secondConfirm.json().alreadyProcessed).toBe(true);
    expect(secondConfirm.json().reservation.status).toBe('CONFIRMED');
  });

  it('rejects using the reject token after the confirm token was already used', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const { confirmToken, rejectToken } = await createPendingReservation(areaId);

    await app.inject({ method: 'POST', url: `/api/v1/reservation-actions/${confirmToken}/confirm` });

    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/reservation-actions/${rejectToken}/reject`,
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('INVALID_ACTION_TOKEN');
  });

  it('rejects an invalid/unknown token with 404', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reservation-actions/this-token-does-not-exist',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('INVALID_ACTION_TOKEN');
  });
});
