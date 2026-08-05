import type { FastifyInstance } from 'fastify';
import { availabilityQuerySchema, createReservationSchema } from '@sternen/shared';
import { z } from 'zod';
import {
  createReservationHandler,
  getAvailability,
  getPublicEventBySlug,
  listAreas,
  listPublicEvents,
} from '../controllers/public.controller.js';
import { parseOrThrow } from '../middleware/validate.js';

const eventSlugParamsSchema = z.object({ slug: z.string().min(1).max(200) });

export function registerPublicRoutes(app: FastifyInstance): void {
  app.get('/api/v1/public/areas', async (request, reply) => {
    await listAreas(request, reply);
  });

  app.get(
    '/api/v1/public/availability',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const input = parseOrThrow(availabilityQuerySchema, request.query);
      await getAvailability(input, request, reply);
    },
  );

  app.post(
    '/api/v1/public/reservations',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const input = parseOrThrow(createReservationSchema, request.body);
      await createReservationHandler(input, request, reply);
    },
  );

  app.get('/api/v1/public/events', async (request, reply) => {
    await listPublicEvents(request, reply);
  });

  app.get('/api/v1/public/events/:slug', async (request, reply) => {
    const params = parseOrThrow(eventSlugParamsSchema, request.params);
    await getPublicEventBySlug(params.slug, request, reply);
  });
}
