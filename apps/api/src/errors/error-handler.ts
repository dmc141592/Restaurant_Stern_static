import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from './app-error.js';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}

function zodIssuesToDetails(error: ZodError): Record<string, unknown> {
  return {
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      if (error.statusCode >= 500) {
        request.log.error({ err: error, requestId }, 'Anwendungsfehler (5xx)');
      } else {
        request.log.warn({ err: error, requestId }, 'Anwendungsfehler (4xx)');
      }

      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...(error.details ? { details: error.details } : {}),
        },
      };
      reply.status(error.statusCode).send(body);
      return;
    }

    if (error instanceof ZodError) {
      request.log.warn({ err: error, requestId }, 'Validierungsfehler');
      const body: ApiErrorBody = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Die Anfrage enthält ungültige oder fehlende Daten.',
          requestId,
          details: zodIssuesToDetails(error),
        },
      };
      reply.status(400).send(body);
      return;
    }

    const fastifyError = error as FastifyError;
    if (fastifyError.statusCode === 429 || fastifyError.code === 'FST_ERR_RATE_LIMIT') {
      request.log.warn({ err: error, requestId }, 'Rate-Limit erreicht');
      const body: ApiErrorBody = {
        error: {
          code: 'RATE_LIMITED',
          message: 'Zu viele Anfragen. Bitte später erneut versuchen.',
          requestId,
        },
      };
      reply.status(429).send(body);
      return;
    }

    if (fastifyError.statusCode && fastifyError.statusCode < 500) {
      request.log.warn({ err: error, requestId }, 'Client-Fehler');
      const body: ApiErrorBody = {
        error: {
          code: fastifyError.code ?? 'BAD_REQUEST',
          message: 'Die Anfrage konnte nicht verarbeitet werden.',
          requestId,
        },
      };
      reply.status(fastifyError.statusCode).send(body);
      return;
    }

    // Unexpected error: never leak stack traces, SQL text, or internal paths.
    request.log.error({ err: error, requestId }, 'Unbehandelter Fehler');
    const body: ApiErrorBody = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte später erneut versuchen.',
        requestId,
      },
    };
    reply.status(500).send(body);
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const body: ApiErrorBody = {
      error: {
        code: 'NOT_FOUND',
        message: 'Die angeforderte Ressource wurde nicht gefunden.',
        requestId: request.id,
      },
    };
    reply.status(404).send(body);
  });
}
