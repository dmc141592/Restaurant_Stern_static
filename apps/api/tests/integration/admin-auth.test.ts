import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, resetDatabase, seedAdministrator, seedAlwaysOpenHours, seedArea } from './helpers/db.js';
import { hashPassword } from '../../src/utils/password.js';

let app: FastifyInstance;

function extractCookie(setCookieHeaders: string | string[] | undefined, name: string): string | undefined {
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : setCookieHeaders ? [setCookieHeaders] : [];
  for (const header of headers) {
    const match = header.match(new RegExp(`^${name}=([^;]*)`));
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

describe('admin authentication and CSRF protection', () => {
  beforeEach(async () => {
    await resetDatabase();
    const built = await buildTestApp();
    app = built.app;
  });

  afterAll(async () => {
    await app?.close();
    await closeTestPool();
  });

  it('logs in with correct credentials and reports an authenticated session', async () => {
    await seedAdministrator('admin@sternen-albisrieden.ch', await hashPassword('correct-password-123'));

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { email: 'admin@sternen-albisrieden.ch', password: 'correct-password-123' },
    });
    expect(loginResponse.statusCode).toBe(200);

    const sessionCookie = extractCookie(loginResponse.headers['set-cookie'], 'sternen_admin_session');
    expect(sessionCookie).toBeTruthy();

    const sessionResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/auth/session',
      headers: { cookie: `sternen_admin_session=${sessionCookie}` },
    });
    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json().authenticated).toBe(true);
  });

  it('rejects an incorrect password with a generic error message', async () => {
    await seedAdministrator('admin@sternen-albisrieden.ch', await hashPassword('correct-password-123'));

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { email: 'admin@sternen-albisrieden.ch', password: 'wrong-password' },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.message).not.toContain('existiert');
  });

  it('rejects a mutating admin request without a CSRF token', async () => {
    await seedAdministrator('admin@sternen-albisrieden.ch', await hashPassword('correct-password-123'));
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { email: 'admin@sternen-albisrieden.ch', password: 'correct-password-123' },
    });
    const sessionCookie = extractCookie(loginResponse.headers['set-cookie'], 'sternen_admin_session');

    const reservationResponse = await app.inject({
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
    const reservationsList = await app.pool.query<{ id: string }>('SELECT id FROM reservations LIMIT 1');
    const reservationId = reservationsList.rows[0]!.id;
    expect(reservationResponse.statusCode).toBe(201);

    const withoutCsrf = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/reservations/${reservationId}/confirm`,
      headers: { cookie: `sternen_admin_session=${sessionCookie}` },
    });
    expect(withoutCsrf.statusCode).toBe(403);
    expect(withoutCsrf.json().error.code).toBe('FORBIDDEN');
  });

  it('accepts a mutating admin request when the correct CSRF token is supplied', async () => {
    await seedAdministrator('admin@sternen-albisrieden.ch', await hashPassword('correct-password-123'));
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });

    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/auth/login',
      payload: { email: 'admin@sternen-albisrieden.ch', password: 'correct-password-123' },
    });
    const sessionCookie = extractCookie(loginResponse.headers['set-cookie'], 'sternen_admin_session');
    const csrfCookie = extractCookie(loginResponse.headers['set-cookie'], 'sternen_admin_csrf');
    expect(csrfCookie).toBeTruthy();

    const reservationResponse = await app.inject({
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
    expect(reservationResponse.statusCode).toBe(201);
    const reservationId = reservationResponse.json().reservation.reference as string;
    const dbRow = await app.pool.query<{ id: string }>('SELECT id FROM reservations WHERE public_reference = $1', [
      reservationId,
    ]);

    const withCsrf = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/reservations/${dbRow.rows[0]!.id}/confirm`,
      headers: {
        cookie: `sternen_admin_session=${sessionCookie}`,
        'x-csrf-token': csrfCookie!,
      },
    });
    expect(withCsrf.statusCode).toBe(200);
    expect(withCsrf.json().status).toBe('CONFIRMED');
  });

  it('rejects any admin request without a session at all', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/reservations' });
    expect(response.statusCode).toBe(401);
  });
});
