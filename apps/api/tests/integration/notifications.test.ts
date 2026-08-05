import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildTestApp } from './helpers/app.js';
import { closeTestPool, getTestPool, resetDatabase, seedAlwaysOpenHours, seedArea } from './helpers/db.js';
import { AlwaysFailingNotificationProvider } from '../fixtures/fake-notification-provider.js';
import { processOutboxOnce } from '../../src/services/notifications.service.js';

describe('notification outbox reliability', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeTestPool();
  });

  it('keeps the reservation even when SMTP is completely unreachable', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });

    const failingProvider = new AlwaysFailingNotificationProvider();
    const { app }: { app: FastifyInstance } = await buildTestApp(failingProvider);

    try {
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

      // The HTTP request must succeed regardless of SMTP being down.
      expect(response.statusCode).toBe(201);
      expect(response.json().reservation.status).toBe('PENDING');

      // Give the fire-and-forget immediate delivery attempt a moment to run.
      await new Promise((resolve) => setTimeout(resolve, 100));

      const pool = getTestPool();
      const { rows } = await pool.query<{ status: string; attempts: number }>(
        `SELECT status, attempts FROM notification_outbox ORDER BY created_at`,
      );
      expect(rows.length).toBe(2);
      for (const row of rows) {
        // Still queued for retry, not silently dropped and not marked SENT.
        expect(row.status).toBe('PENDING');
        expect(row.attempts).toBeGreaterThanOrEqual(1);
      }
    } finally {
      await app.close();
    }
  });

  it('retries with backoff and eventually marks a permanently failing notification as FAILED', async () => {
    await seedAlwaysOpenHours();
    const areaId = await seedArea({ slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60 });
    const failingProvider = new AlwaysFailingNotificationProvider();
    const { app }: { app: FastifyInstance } = await buildTestApp(failingProvider);

    try {
      await app.inject({
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

      const pool = getTestPool();

      // Force every retry to be immediately due (instead of waiting for the
      // real exponential backoff) and process until the worker gives up.
      for (let round = 0; round < 10; round += 1) {
        await pool.query("UPDATE notification_outbox SET next_attempt_at = now() WHERE status = 'PENDING'");
        await processOutboxOnce(pool, failingProvider, 10);
      }

      const { rows } = await pool.query<{ status: string; attempts: number }>(
        `SELECT status, attempts FROM notification_outbox`,
      );
      expect(rows.length).toBe(2);
      for (const row of rows) {
        expect(row.status).toBe('FAILED');
        expect(row.attempts).toBeGreaterThanOrEqual(8);
      }
    } finally {
      await app.close();
    }
  });
});
