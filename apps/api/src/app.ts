import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import type { AppConfig } from './config/index.js';
import { registerErrorHandler } from './errors/error-handler.js';
import type { NotificationProvider } from './providers/email/notification-provider.js';
import { registerAdminAreaRoutes } from './routes/admin-areas.routes.js';
import { registerAdminAuthRoutes } from './routes/admin-auth.routes.js';
import { registerAdminBlockRoutes } from './routes/admin-blocks.routes.js';
import { registerAdminEventRoutes } from './routes/admin-events.routes.js';
import { registerAdminOpeningHoursRoutes } from './routes/admin-opening-hours.routes.js';
import { registerAdminReservationRoutes } from './routes/admin-reservations.routes.js';
import { registerHealthRoutes } from './routes/health.routes.js';
import { registerPublicRoutes } from './routes/public.routes.js';
import { registerReservationActionRoutes } from './routes/reservation-actions.routes.js';

export interface AppDependencies {
  pool: Pool;
  config: AppConfig;
  notificationProvider: NotificationProvider;
}

const MAX_BODY_BYTES = 256 * 1024;

export async function buildApp(deps: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: deps.config.logLevel },
    trustProxy: true,
    genReqId: () => randomUUID(),
    bodyLimit: MAX_BODY_BYTES,
  });

  app.decorate('pool', deps.pool);
  app.decorate('config', deps.config);
  app.decorate('notificationProvider', deps.notificationProvider);

  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: deps.config.allowedOrigins,
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
  });

  registerErrorHandler(app);

  registerHealthRoutes(app);
  registerPublicRoutes(app);
  registerReservationActionRoutes(app);
  registerAdminAuthRoutes(app);
  registerAdminReservationRoutes(app);
  registerAdminAreaRoutes(app);
  registerAdminBlockRoutes(app);
  registerAdminOpeningHoursRoutes(app);
  registerAdminEventRoutes(app);

  return app;
}
