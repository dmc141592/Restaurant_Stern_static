import 'dotenv/config';
import { buildApp } from './app.js';
import { loadConfig } from './config/index.js';
import { closePool, createPool } from './db/client.js';
import { NodemailerNotificationProvider } from './providers/email/nodemailer-provider.js';
import { processOutboxOnce, resetStaleOutboxEntries } from './services/notifications.service.js';

const OUTBOX_POLL_INTERVAL_MS = 15_000;
const STALE_RESET_INTERVAL_MS = 5 * 60_000;
const OUTBOX_BATCH_SIZE = 20;

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config);
  const provider = new NodemailerNotificationProvider(config);
  const app = await buildApp({ pool, config, notificationProvider: provider });

  const outboxInterval = setInterval(() => {
    processOutboxOnce(pool, provider, OUTBOX_BATCH_SIZE).catch((error: unknown) => {
      app.log.error({ err: error }, 'Periodische Outbox-Verarbeitung fehlgeschlagen.');
    });
  }, OUTBOX_POLL_INTERVAL_MS);

  const staleResetInterval = setInterval(() => {
    resetStaleOutboxEntries(pool, 10).catch((error: unknown) => {
      app.log.error({ err: error }, 'Zurücksetzen hängender Outbox-Einträge fehlgeschlagen.');
    });
  }, STALE_RESET_INTERVAL_MS);

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    app.log.info(`Empfange ${signal}, fahre Server herunter...`);
    clearInterval(outboxInterval);
    clearInterval(staleResetInterval);
    await app.close();
    await closePool();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT').catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
  });

  await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
