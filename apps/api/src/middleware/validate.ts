import type { ZodType } from 'zod';
import { ValidationError } from '../errors/app-error.js';

/**
 * Parses `data` against `schema`, throwing a `ValidationError` (mapped to a
 * 400 by the central error handler) on failure. Routes call this before
 * invoking a controller, so controllers only ever see already-valid input.
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError('Die Anfrage enthält ungültige oder fehlende Daten.', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
  return result.data;
}
