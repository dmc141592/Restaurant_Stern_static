/** Minimal logger shape services depend on, satisfied structurally by Fastify's Pino logger. */
export interface AppLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
}

export const consoleLogger: AppLogger = {
  info: (obj, msg) => console.log(msg ?? '', obj),
  warn: (obj, msg) => console.warn(msg ?? '', obj),
  error: (obj, msg) => console.error(msg ?? '', obj),
};
