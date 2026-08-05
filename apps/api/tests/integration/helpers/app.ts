import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../../src/app.js';
import type { NotificationProvider } from '../../../src/providers/email/notification-provider.js';
import { buildTestConfig } from '../../fixtures/test-config.js';
import { FakeNotificationProvider } from '../../fixtures/fake-notification-provider.js';
import { getTestPool } from './db.js';

export async function buildTestApp<T extends NotificationProvider = FakeNotificationProvider>(
  providerOverride?: T,
): Promise<{ app: FastifyInstance; provider: T }> {
  const provider = providerOverride ?? (new FakeNotificationProvider() as unknown as T);
  const app = await buildApp({
    pool: getTestPool(),
    config: buildTestConfig(),
    notificationProvider: provider,
  });
  await app.ready();
  return { app, provider };
}
