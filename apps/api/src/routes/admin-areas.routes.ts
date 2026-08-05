import type { FastifyInstance } from 'fastify';
import { createAreaSchema, updateAreaSchema, uuidSchema } from '@sternen/shared';
import { z } from 'zod';
import {
  createAreaHandler,
  listAreasHandler,
  updateAreaHandler,
} from '../controllers/admin-areas.controller.js';
import { requireAdminSession, requireCsrf } from '../middleware/admin-auth.js';
import { parseOrThrow } from '../middleware/validate.js';

const idParamsSchema = z.object({ id: uuidSchema });

export function registerAdminAreaRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/areas', { preHandler: [requireAdminSession] }, async (request, reply) => {
    await listAreasHandler(request, reply);
  });

  app.post(
    '/api/v1/admin/areas',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const input = parseOrThrow(createAreaSchema, request.body);
      await createAreaHandler(input, request, reply);
    },
  );

  app.patch(
    '/api/v1/admin/areas/:id',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      const input = parseOrThrow(updateAreaSchema, request.body);
      await updateAreaHandler(params.id, input, request, reply);
    },
  );
}
