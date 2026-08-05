import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../errors/app-error.js';
import { authenticateApiKey } from '../services/api-keys.service.js';

const BEARER_PREFIX = 'Bearer ';

export async function requireApiKey(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    throw new UnauthorizedError('Ein gültiger API-Key ist für diesen Endpunkt erforderlich.');
  }
  const providedKey = header.slice(BEARER_PREFIX.length).trim();
  if (providedKey.length === 0) {
    throw new UnauthorizedError('Ein gültiger API-Key ist für diesen Endpunkt erforderlich.');
  }

  request.apiKey = await authenticateApiKey(request.server.pool, request.server.config, providedKey);
}
