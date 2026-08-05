import 'dotenv/config';
import { Client } from 'pg';

/**
 * Seed data explicitly marked as a starting point (see README + admin UI
 * banner). Capacities, resource modes and opening hours MUST be reviewed and
 * confirmed by the restaurant before production launch — none of this is a
 * verified production value, and none of it is hard-coded into application
 * logic; it is only ever read from the database and editable via the admin
 * area afterwards.
 */
const SEED_AREAS = [
  { slug: 'restaurant', name: 'Restaurant', resourceMode: 'CAPACITY', capacity: 60, sortOrder: 1 },
  { slug: 'saeli', name: 'Säli', resourceMode: 'EXCLUSIVE', capacity: 50, sortOrder: 2 },
  { slug: 'jaegerstuebli', name: 'Jägerstübli', resourceMode: 'EXCLUSIVE', capacity: 20, sortOrder: 3 },
  { slug: 'treichle-bar', name: 'Treichle Bar', resourceMode: 'CAPACITY', capacity: 40, sortOrder: 4 },
  { slug: 'garten', name: 'Garten', resourceMode: 'CAPACITY', capacity: 200, sortOrder: 5 },
] as const;

// PLATZHALTER-Öffnungszeiten für die lokale Entwicklung. 0 = Montag ... 6 = Sonntag.
const SEED_OPENING_HOURS = [
  { weekday: 1, opensAt: '11:00', closesAt: '14:00' },
  { weekday: 1, opensAt: '18:00', closesAt: '23:00' },
  { weekday: 2, opensAt: '11:00', closesAt: '14:00' },
  { weekday: 2, opensAt: '18:00', closesAt: '23:00' },
  { weekday: 3, opensAt: '11:00', closesAt: '14:00' },
  { weekday: 3, opensAt: '18:00', closesAt: '23:00' },
  { weekday: 4, opensAt: '11:00', closesAt: '14:00' },
  { weekday: 4, opensAt: '18:00', closesAt: '23:30' },
  { weekday: 5, opensAt: '11:00', closesAt: '14:00' },
  { weekday: 5, opensAt: '18:00', closesAt: '23:30' },
  { weekday: 6, opensAt: '11:00', closesAt: '23:30' },
] as const;

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL ist nicht gesetzt.');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    console.log(
      'Seed-Hinweis: Kapazitäten, Ressourcenarten, Buchbarkeit und Öffnungszeiten sind ' +
        'PLATZHALTER-Ausgangswerte und müssen vor dem Produktionsstart vom Restaurant bestätigt werden.',
    );

    for (const area of SEED_AREAS) {
      await client.query(
        `INSERT INTO areas (slug, name, resource_mode, capacity, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO NOTHING`,
        [area.slug, area.name, area.resourceMode, area.capacity, area.sortOrder],
      );
    }

    const { rows: existingHours } = await client.query('SELECT 1 FROM opening_hours LIMIT 1');
    if (existingHours.length === 0) {
      for (const entry of SEED_OPENING_HOURS) {
        await client.query(
          `INSERT INTO opening_hours (weekday, opens_at, closes_at) VALUES ($1, $2, $3)`,
          [entry.weekday, entry.opensAt, entry.closesAt],
        );
      }
    } else {
      console.log('Öffnungszeiten bereits vorhanden, überspringe Seed für opening_hours.');
    }

    console.log('Seed abgeschlossen.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
