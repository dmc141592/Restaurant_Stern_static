import 'dotenv/config';
import { loadConfig } from '../config/index.js';
import { closePool, createPool } from '../db/client.js';
import { NodemailerNotificationProvider } from '../providers/email/nodemailer-provider.js';
import { processOutboxOnce, resetStaleOutboxEntries } from '../services/notifications.service.js';

const BATCH_SIZE = 25;
const POLL_INTERVAL_MS = 10_000;

/**
 * Standalone outbox worker, useful when running the API and the email
 * worker as separate deployable processes (the API server also runs this
 * loop internally by default — see server.ts — so this script is optional).
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const pool = createPool(config);
  const provider = new NodemailerNotificationProvider(config);

  console.log('Outbox-Worker gestartet.');

  let running = true;
  const stop = (): void => {
    running = false;
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  let cyclesSinceStaleReset = 0;
  while (running) {
    const result = await processOutboxOnce(pool, provider, BATCH_SIZE);
    if (result.claimed > 0) {
      console.log(`Outbox: ${result.sent} gesendet, ${result.failed} fehlgeschlagen (von ${result.claimed}).`);
    }

    cyclesSinceStaleReset += 1;
    if (cyclesSinceStaleReset >= 30) {
      const resetCount = await resetStaleOutboxEntries(pool, 10);
      if (resetCount > 0) {
        console.log(`${resetCount} hängende Outbox-Einträge zurückgesetzt.`);
      }
      cyclesSinceStaleReset = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  await closePool();
  console.log('Outbox-Worker beendet.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
