import type { ApiErrorBody } from '@sternen/shared';
import { env } from '../config/env.js';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;
  readonly details?: Record<string, unknown>;

  constructor(body: ApiErrorBody['error'], status: number) {
    super(body.message);
    this.name = 'ApiError';
    this.code = body.code;
    this.status = status;
    this.requestId = body.requestId;
    this.details = body.details;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const value = match?.[1];
  return value !== undefined ? decodeURIComponent(value) : null;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Include admin session cookies and CSRF header for mutating admin requests. */
  withAdminAuth?: boolean;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

const CSRF_COOKIE_NAME = 'sternen_admin_csrf';

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};
  const init: RequestInit = { method, signal: options.signal };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }
  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }
  if (options.withAdminAuth) {
    init.credentials = 'include';
    if (method !== 'GET') {
      const csrfToken = readCookie(CSRF_COOKIE_NAME);
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }
  }

  init.headers = headers;

  const response = await fetch(`${env.apiBaseUrl}${path}`, init);

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : undefined;

  if (!response.ok) {
    if (payload && typeof payload === 'object' && 'error' in payload) {
      throw new ApiError((payload as ApiErrorBody).error, response.status);
    }
    throw new ApiError(
      { code: 'UNKNOWN_ERROR', message: 'Ein unerwarteter Fehler ist aufgetreten.', requestId: '' },
      response.status,
    );
  }

  return payload as T;
}

export function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
}
