import type { FastifyInstance } from 'fastify';
import { posReservationListQuerySchema, reservationStatusActionSchema, uuidSchema } from '@sternen/shared';
import { z } from 'zod';
import {
  cancelReservationHandler,
  confirmReservationHandler,
  getReservationHandler,
  listReservationsHandler,
  rejectReservationHandler,
} from '../controllers/admin-reservations.controller.js';
import { requireAdminSession, requireAdminSessionOrApiKey, requireCsrf } from '../middleware/admin-auth.js';
import { parseOrThrow } from '../middleware/validate.js';

const idParamsSchema = z.object({ id: uuidSchema });

export function registerAdminReservationRoutes(app: FastifyInstance): void {
  // Dual-protected: the admin UI sends its session cookie, a future POS
  // client sends `Authorization: Bearer <api-key>` (see brief sections 16 + 17).
  app.get(
    '/api/v1/admin/reservations',
    { preHandler: [requireAdminSessionOrApiKey] },
    async (request, reply) => {
      const query = parseOrThrow(posReservationListQuerySchema, request.query);
      await listReservationsHandler(query, request, reply);
    },
  );

  app.get(
    '/api/v1/admin/reservations/:id',
    { preHandler: [requireAdminSession] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      await getReservationHandler(params.id, request, reply);
    },
  );

  app.post(
    '/api/v1/admin/reservations/:id/confirm',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      await confirmReservationHandler(params.id, request, reply);
    },
  );

  app.post(
    '/api/v1/admin/reservations/:id/reject',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      const input = parseOrThrow(reservationStatusActionSchema, request.body ?? {});
      await rejectReservationHandler(params.id, input, request, reply);
    },
  );

  app.post(
    '/api/v1/admin/reservations/:id/cancel',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      await cancelReservationHandler(params.id, request, reply);
    },
  );
}
