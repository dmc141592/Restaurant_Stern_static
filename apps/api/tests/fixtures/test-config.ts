import type { AppConfig } from '../../src/config/index.js';

export function buildTestConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    nodeEnv: 'test',
    isProduction: false,
    host: '127.0.0.1',
    port: 0,
    databaseUrl: 'postgres://unused',
    businessTimeZone: 'Europe/Zurich',
    frontendUrl: 'http://localhost:5173',
    allowedOrigins: ['http://localhost:5173'],
    session: { secret: 'test-session-secret-at-least-32-characters', ttlSeconds: 43200 },
    email: {
      restaurantNotificationEmail: 'reservation@sternen-albisrieden.ch',
      smtpHost: 'localhost',
      smtpPort: 1025,
      smtpSecure: false,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'no-reply@sternen-albisrieden.ch',
      fromName: 'Restaurant Sternen Albisrieden',
    },
    actionLinkBaseUrl: 'http://localhost:5173/reservationsaktion',
    posApiKeyPepper: 'test-pos-api-key-pepper-at-least-32-chars',
    tokenHashPepper: 'test-token-hash-pepper-at-least-32-chars',
    logLevel: 'silent',
    personalDataRetentionDays: 730,
    turnstile: { enabled: false, secretKey: '' },
    ...overrides,
  };
}
