export interface AppErrorOptions {
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode: number, options?: AppErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = options?.details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, { details });
  }
}

export class AvailabilityConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AVAILABILITY_CONFLICT', message, 409, { details });
  }
}

export class AreaNotBookableError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AREA_NOT_BOOKABLE', message, 409, { details });
  }
}

export class OutsideOpeningHoursError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('OUTSIDE_OPENING_HOURS', message, 409, { details });
  }
}

export class BlockConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('BLOCK_CONFLICT', message, 409, { details });
  }
}

export class ReservationStateConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('RESERVATION_STATE_CONFLICT', message, 409, { details });
  }
}

export class InvalidActionTokenError extends AppError {
  constructor(message = 'Dieser Link ist ungültig oder abgelaufen.') {
    super('INVALID_ACTION_TOKEN', message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Anmeldung erforderlich.') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Für diese Aktion fehlt die Berechtigung.') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Die angeforderte Ressource wurde nicht gefunden.') {
    super('NOT_FOUND', message, 404);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Zu viele Anfragen. Bitte später erneut versuchen.') {
    super('RATE_LIMITED', message, 429);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string) {
    super('CONFIGURATION_ERROR', message, 500);
  }
}
