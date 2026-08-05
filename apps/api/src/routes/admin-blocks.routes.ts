import type { FastifyInstance } from 'fastify';
import { adminBlockListQuerySchema, createBlockSchema, updateBlockSchema, uuidSchema } from '@sternen/shared';
import { z } from 'zod';
import {
  createBlockHandler,
  deleteBlockHandler,
  listBlocksHandler,
  updateBlockHandler,
} from '../controllers/admin-blocks.controller.js';
import { requireAdminSession, requireCsrf } from '../middleware/admin-auth.js';
import { parseOrThrow } from '../middleware/validate.js';

const idParamsSchema = z.object({ id: uuidSchema });

export function registerAdminBlockRoutes(app: FastifyInstance): void {
  app.get('/api/v1/admin/blocks', { preHandler: [requireAdminSession] }, async (request, reply) => {
    const query = parseOrThrow(adminBlockListQuerySchema, request.query);
    await listBlocksHandler(query, request, reply);
  });

  app.post(
    '/api/v1/admin/blocks',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const input = parseOrThrow(createBlockSchema, request.body);
      await createBlockHandler(input, request, reply);
    },
  );

  app.patch(
    '/api/v1/admin/blocks/:id',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      const input = parseOrThrow(updateBlockSchema, request.body);
      await updateBlockHandler(params.id, input, request, reply);
    },
  );

  app.delete(
    '/api/v1/admin/blocks/:id',
    { preHandler: [requireAdminSession, requireCsrf] },
    async (request, reply) => {
      const params = parseOrThrow(idParamsSchema, request.params);
      await deleteBlockHandler(params.id, request, reply);
    },
  );
}
