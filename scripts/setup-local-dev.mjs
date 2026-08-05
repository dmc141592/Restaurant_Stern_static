#!/usr/bin/env node
/**
 * One-shot local setup: builds the shared package, applies database
 * migrations, and seeds starter data. Run after `npm install` and after
 * copying apps/api/.env.example -> apps/api/.env (with a running Postgres,
 * e.g. via `docker compose up -d postgres`).
 *
 * Usage: node scripts/setup-local-dev.mjs
 */
import { spawnSync } from 'node:child_process';

function run(command, args) {
  console.log(`\n> ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`Befehl fehlgeschlagen: ${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

run('npm', ['run', 'build', '--workspace', 'packages/shared']);
run('npm', ['run', 'db:migrate', '--workspace', 'apps/api']);
run('npm', ['run', 'db:seed', '--workspace', 'apps/api']);

console.log(
  '\nFertig. Nächste Schritte:\n' +
    '  1. ADMIN_INITIAL_EMAIL / ADMIN_INITIAL_PASSWORD in apps/api/.env setzen\n' +
    '  2. npm run admin:bootstrap --workspace apps/api\n' +
    '  3. npm run dev:api   (Backend)\n' +
    '  4. npm run dev:web   (Frontend)\n',
);
