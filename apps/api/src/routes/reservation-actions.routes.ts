import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { confirmAction, previewAction, rejectAction } from '../controllers/reservation-actions.controller.js';
import { parseOrThrow } from '../middleware/validate.js';

const tokenParamsSchema = z.object({ token: z.string().min(16).max(4096) });

export function registerReservationActionRoutes(app: FastifyInstance): void {
  app.get(
    '/api/v1/reservation-actions/:token',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const params = parseOrThrow(tokenParamsSchema, request.params);
      await previewAction(params.token, request, reply);
    },
  );

  app.post(
    '/api/v1/reservation-actions/:token/confirm',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const params = parseOrThrow(tokenParamsSchema, request.params);
      await confirmAction(params.token, request, reply);
    },
  );

  app.post(
    '/api/v1/reservation-actions/:token/reject',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const params = parseOrThrow(tokenParamsSchema, request.params);
      await rejectAction(params.token, request, reply);
    },
  );
}
