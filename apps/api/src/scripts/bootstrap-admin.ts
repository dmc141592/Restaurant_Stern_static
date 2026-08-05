import 'dotenv/config';
import { loadConfig } from '../config/index.js';
import { closePool, createPool } from '../db/client.js';
import * as adminsRepo from '../repositories/administrators.repository.js';
import { hashPassword } from '../utils/password.js';

/**
 * Creates the first administrator account from ADMIN_INITIAL_EMAIL /
 * ADMIN_INITIAL_PASSWORD. Safe to re-run: does nothing if an administrator
 * with that email already exists. Intended for local setup and first
 * production deployment only — rotate/replace the password afterwards via
 * a proper admin-management flow.
 */
async function main(): Promise<void> {
  const email = process.env.ADMIN_INITIAL_EMAIL;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_INITIAL_EMAIL und ADMIN_INITIAL_PASSWORD müssen gesetzt sein.');
  }
  if (password.length < 8) {
    throw new Error('ADMIN_INITIAL_PASSWORD muss mindestens 8 Zeichen lang sein.');
  }

  const config = loadConfig();
  const pool = createPool(config);

  try {
    const existing = await adminsRepo.findAdministratorByEmail(pool, email);
    if (existing) {
      console.log(`Administrator ${email} existiert bereits. Kein Bootstrap notwendig.`);
      return;
    }

    const passwordHash = await hashPassword(password);
    await adminsRepo.insertAdministrator(pool, email, passwordHash);
    console.log(`Administrator ${email} wurde erstellt.`);
  } finally {
    await closePool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
