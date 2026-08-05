import type { Pool } from 'pg';
import type { AppConfig } from '../config/index.js';
import type { NotificationProvider } from '../providers/email/notification-provider.js';
import type { AuthenticatedSession } from '../services/admin-auth.service.js';
import type { IntegrationApiKey } from './domain.js';

declare module 'fastify' {
  interface FastifyInstance {
    pool: Pool;
    config: AppConfig;
    notificationProvider: NotificationProvider;
  }

  interface FastifyRequest {
    adminSession?: AuthenticatedSession;
    adminSessionSecret?: string;
    apiKey?: IntegrationApiKey;
  }
}
