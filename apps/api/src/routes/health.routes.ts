import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health/live', async () => ({ status: 'ok' }));

  app.get('/health/ready', async (_request, reply) => {
    try {
      await app.pool.query('SELECT 1');
      return { status: 'ok' };
    } catch (error) {
      app.log.error({ err: error }, 'Readiness-Check fehlgeschlagen: Datenbank nicht erreichbar.');
      reply.status(503);
      return { status: 'unavailable' };
    }
  });
}
