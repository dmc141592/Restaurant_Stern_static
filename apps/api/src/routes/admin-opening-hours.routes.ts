import type { FastifyInstance } from 'fastify';
import {
  createSpecialHourSchema,
  replaceOpeningHoursSchema,
  updateSpecialHourSchema,
  uuidSchema,
} from '@sternen/shared';
import { z } from 'zod';
import {
  createSpecialHourHandler,
  deleteSpecialHourHandler,
  listOpeningHoursHandler,
  listSpecialHoursHandler,
  replaceOpeningHoursHandler,
  updateSpecialHourHandler,
} from '../controllers/admin-opening-hours.controller.js';
import { requireAdminSession, requireCsrf } from '../middleware/admin-auth.js';
import { parseOrThrow } from '../middleware/validate.js';

const idParamsSchema = z.object({ id: uuidSchema });

export function registerAdminOpeningHoursRoutes(app: FastifyInstance): void {
  app.get(
    '/api/v1/admin/opening-hours',
    { preHandler: [requireAdminSession] },
    async (request, reply) => {
      await listOpeningHoursHandler(request, reply);
    },
  );

  app.put(
    '/api/v1/admin/opening-hours',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const input = parseOrThrow(replaceOpeningHoursSchema, request.body);
      await replaceOpeningHoursHandler(input, request, reply);
    },
  );

  app.get(
    '/api/v1/admin/special-hours',
    { preHandler: [requireAdminSession] },
    async (request, reply) => {
      await listSpecialHoursHandler(request, reply);
    },
  );

  app.post(
    '/api/v1/admin/special-hours',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const input = parseOrThrow(createSpecialHourSchema, request.body);
      await createSpecialHourHandler(input, request, reply);
    },
  );

  app.patch(
    '/api/v1/admin/special-hours/:id',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      const input = parseOrThrow(updateSpecialHourSchema, request.body);
      await updateSpecialHourHandler(params.id, input, request, reply);
    },
  );

  app.delete(
    '/api/v1/admin/special-hours/:id',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      await deleteSpecialHourHandler(params.id, request, reply);
    },
  );
}
