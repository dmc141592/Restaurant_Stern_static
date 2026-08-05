import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error.js';
import { assertCsrfTokenValid, validateSession } from '../services/admin-auth.service.js';
import { authenticateApiKey } from '../services/api-keys.service.js';

const BEARER_PREFIX = 'Bearer ';

export const ADMIN_SESSION_COOKIE = 'sternen_admin_session';
export const ADMIN_CSRF_COOKIE = 'sternen_admin_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export async function requireAdminSession(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const sessionSecret = request.cookies[ADMIN_SESSION_COOKIE];
  if (!sessionSecret) {
    throw new UnauthorizedError('Anmeldung erforderlich.');
  }

  const session = await validateSession(request.server.pool, request.server.config, sessionSecret);
  if (!session) {
    throw new UnauthorizedError('Sitzung ist abgelaufen oder ungültig. Bitte erneut anmelden.');
  }

  request.adminSession = session;
  request.adminSessionSecret = sessionSecret;
}

/**
 * Section 16 and section 17 of the brief describe the *same* path,
 * `GET /api/v1/admin/reservations`, under two different auth models (admin
 * session for the staff UI, a bearer API key for a future POS system). We
 * resolve that by accepting either: the admin UI sends its session cookie,
 * a POS client sends `Authorization: Bearer <key>`. Exactly one must be
 * valid; the controller checks which one populated the request to decide
 * which response shape and export-logging behaviour applies.
 */
export async function requireAdminSessionOrApiKey(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith(BEARER_PREFIX)) {
    const providedKey = authHeader.slice(BEARER_PREFIX.length).trim();
    request.apiKey = await authenticateApiKey(request.server.pool, request.server.config, providedKey);
    return;
  }

  const sessionSecret = request.cookies[ADMIN_SESSION_COOKIE];
  if (sessionSecret) {
    const session = await validateSession(request.server.pool, request.server.config, sessionSecret);
    if (session) {
      request.adminSession = session;
      request.adminSessionSecret = sessionSecret;
      return;
    }
  }

  throw new UnauthorizedError('Anmeldung oder gültiger API-Key erforderlich.');
}

/** Must run after `requireAdminSession`. Enforces CSRF protection on writes. */
export async function requireCsrf(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!request.adminSession) {
    throw new ForbiddenError('CSRF-Prüfung ohne aktive Sitzung nicht möglich.');
  }
  const providedToken = request.headers[CSRF_HEADER];
  assertCsrfTokenValid(
    request.adminSession,
    request.server.config,
    typeof providedToken === 'string' ? providedToken : undefined,
  );
}
