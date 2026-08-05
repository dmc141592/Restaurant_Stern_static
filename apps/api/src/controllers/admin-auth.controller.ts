import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminLoginInput } from '@sternen/shared';
import type { AppConfig } from '../config/index.js';
import { ADMIN_CSRF_COOKIE, ADMIN_SESSION_COOKIE } from '../middleware/admin-auth.js';
import { login, logout } from '../services/admin-auth.service.js';

function cookieOptions(config: AppConfig, httpOnly: boolean, expires?: Date) {
  return {
    httpOnly,
    secure: config.isProduction,
    sameSite: (config.isProduction ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    expires,
  };
}

export async function loginHandler(
  input: AdminLoginInput,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const config = request.server.config;
  const result = await login(request.server.pool, config, input.email, input.password);

  reply.setCookie(
    ADMIN_SESSION_COOKIE,
    result.sessionSecret,
    cookieOptions(config, true, result.expiresAt),
  );
  reply.setCookie(ADMIN_CSRF_COOKIE, result.csrfSecret, cookieOptions(config, false, result.expiresAt));

  reply.send({
    administrator: { email: result.administrator.email },
  });
}

export async function logoutHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const config = request.server.config;
  const sessionSecret = request.cookies[ADMIN_SESSION_COOKIE];
  if (sessionSecret) {
    await logout(request.server.pool, config, sessionSecret);
  }
  reply.clearCookie(ADMIN_SESSION_COOKIE, { path: '/' });
  reply.clearCookie(ADMIN_CSRF_COOKIE, { path: '/' });
  reply.send({ success: true });
}

export async function sessionHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.adminSession) {
    reply.status(401).send({ authenticated: false });
    return;
  }
  reply.send({
    authenticated: true,
    administrator: { email: request.adminSession.administrator.email },
  });
}
