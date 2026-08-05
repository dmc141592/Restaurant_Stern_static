import type { FastifyInstance } from 'fastify';
import { adminLoginSchema } from '@sternen/shared';
import { loginHandler, logoutHandler, sessionHandler } from '../controllers/admin-auth.controller.js';
import { requireAdminSession } from '../middleware/admin-auth.js';
import { parseOrThrow } from '../middleware/validate.js';

export function registerAdminAuthRoutes(app: FastifyInstance): void {
  app.post(
    '/api/v1/admin/auth/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const input = parseOrThrow(adminLoginSchema, request.body);
      await loginHandler(input, request, reply);
    },
  );

  app.post('/api/v1/admin/auth/logout', { preHandler: requireAdminSession }, async (request, reply) => {
    await logoutHandler(request, reply);
  });

  app.get('/api/v1/admin/auth/session', async (request, reply) => {
    try {
      await requireAdminSession(request, reply);
    } catch {
      reply.status(401).send({ authenticated: false });
      return;
    }
    await sessionHandler(request, reply);
  });
}
