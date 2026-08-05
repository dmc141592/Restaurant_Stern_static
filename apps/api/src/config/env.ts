import { z } from 'zod';

const booleanFromString = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.enum(['true', 'false']))
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL ist erforderlich.'),

  BUSINESS_TIME_ZONE: z.string().min(1).default('Europe/Zurich'),

  FRONTEND_URL: z.url('FRONTEND_URL muss eine gültige URL sein.'),
  ALLOWED_ORIGINS: z
    .string()
    .min(1, 'ALLOWED_ORIGINS ist erforderlich.')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET muss mindestens 32 Zeichen lang sein.'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(43200),

  RESTAURANT_NOTIFICATION_EMAIL: z.email(),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: booleanFromString.default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM_EMAIL: z.email(),
  SMTP_FROM_NAME: z.string().min(1),

  ACTION_LINK_BASE_URL: z.url('ACTION_LINK_BASE_URL muss eine gültige URL sein.'),

  POS_API_KEY_PEPPER: z.string().min(32, 'POS_API_KEY_PEPPER muss mindestens 32 Zeichen lang sein.'),
  TOKEN_HASH_PEPPER: z.string().min(32, 'TOKEN_HASH_PEPPER muss mindestens 32 Zeichen lang sein.'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  PERSONAL_DATA_RETENTION_DAYS: z.coerce.number().int().positive().default(730),

  TURNSTILE_ENABLED: booleanFromString.default(false),
  TURNSTILE_SECRET_KEY: z.string().default(''),

  // Bootstrap-only variables consumed by scripts, not the running server.
  ADMIN_INITIAL_EMAIL: z.email().optional(),
  ADMIN_INITIAL_PASSWORD: z.string().min(8).optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    console.error(
      `Ungültige oder fehlende Umgebungsvariablen. Der Server wird nicht gestartet:\n${issues}`,
    );
    process.exit(1);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = undefined;
}
