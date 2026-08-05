import type { FastifyInstance } from 'fastify';
import { createEventSchema, updateEventSchema, uuidSchema } from '@sternen/shared';
import { z } from 'zod';
import {
  createEventHandler,
  deleteEventHandler,
  getEventHandler,
  listEventsHandler,
  updateEventHandler,
} from '../controllers/admin-events.controller.js';
import { requireAdminSession, requireCsrf } from '../middleware/admin-auth.js';
import { parseOrThrow } from '../middleware/validate.js';

const idParamsSchema = z.object({ id: uuidSchema });

export function registerAdminEventRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/events', { preHandler: [requireAdminSession] }, async (request, reply) => {
    await listEventsHandler(request, reply);
  });

  app.get(
    '/api/v1/admin/events/:id',
    { preHandler: [requireAdminSession] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      await getEventHandler(params.id, request, reply);
    },
  );

  app.post(
    '/api/v1/admin/events',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const input = parseOrThrow(createEventSchema, request.body);
      await createEventHandler(input, request, reply);
    },
  );

  app.patch(
    '/api/v1/admin/events/:id',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      const input = parseOrThrow(updateEventSchema, request.body);
      await updateEventHandler(params.id, input, request, reply);
    },
  );

  app.delete(
    '/api/v1/admin/events/:id',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      await deleteEventHandler(params.id, request, reply);
    },
  );
}
