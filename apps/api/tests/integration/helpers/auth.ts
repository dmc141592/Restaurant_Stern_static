import type { FastifyInstance } from 'fastify';
import { hashPassword } from '../../../src/utils/password.js';
import { seedAdministrator } from './db.js';

export function extractCookie(setCookieHeaders: string | string[] | undefined, name: string): string {
  const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : setCookieHeaders ? [setCookieHeaders] : [];
  for (const header of headers) {
    const match = header.match(new RegExp(`^${name}=([^;]*)`));
    if (match) {
      return match[1]!;
    }
  }
  throw new Error(`Cookie ${name} nicht in Set-Cookie-Headern gefunden.`);
}

export type AdminSessionHeaders = Record<string, string>;

export async function loginAsAdmin(
  app: FastifyInstance,
  email = 'admin@sternen-albisrieden.ch',
  password = 'correct-password-123',
): Promise<AdminSessionHeaders> {
  await seedAdministrator(email, await hashPassword(password));

  const response = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/auth/login',
    payload: { email, password },
  });
  if (response.statusCode !== 200) {
    throw new Error(`Admin-Login im Test fehlgeschlagen: ${response.statusCode} ${response.body}`);
  }

  const sessionCookie = extractCookie(response.headers['set-cookie'], 'sternen_admin_session');
  const csrfCookie = extractCookie(response.headers['set-cookie'], 'sternen_admin_csrf');

  return {
    cookie: `sternen_admin_session=${sessionCookie}`,
    'x-csrf-token': csrfCookie,
  };
}
