import { loadEnv } from './env.js';

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  host: string;
  port: number;
  databaseUrl: string;
  businessTimeZone: string;
  frontendUrl: string;
  allowedOrigins: string[];
  session: {
    secret: string;
    ttlSeconds: number;
  };
  email: {
    restaurantNotificationEmail: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPassword: string;
    fromEmail: string;
    fromName: string;
  };
  actionLinkBaseUrl: string;
  posApiKeyPepper: string;
  tokenHashPepper: string;
  logLevel: string;
  personalDataRetentionDays: number;
  turnstile: {
    enabled: boolean;
    secretKey: string;
  };
}

export function loadConfig(): AppConfig {
  const env = loadEnv();

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    host: env.HOST,
    port: env.PORT,
    databaseUrl: env.DATABASE_URL,
    businessTimeZone: env.BUSINESS_TIME_ZONE,
    frontendUrl: env.FRONTEND_URL,
    allowedOrigins: env.ALLOWED_ORIGINS,
    session: {
      secret: env.SESSION_SECRET,
      ttlSeconds: env.SESSION_TTL_SECONDS,
    },
    email: {
      restaurantNotificationEmail: env.RESTAURANT_NOTIFICATION_EMAIL,
      smtpHost: env.SMTP_HOST,
      smtpPort: env.SMTP_PORT,
      smtpSecure: env.SMTP_SECURE,
      smtpUser: env.SMTP_USER,
      smtpPassword: env.SMTP_PASSWORD,
      fromEmail: env.SMTP_FROM_EMAIL,
      fromName: env.SMTP_FROM_NAME,
    },
    actionLinkBaseUrl: env.ACTION_LINK_BASE_URL,
    posApiKeyPepper: env.POS_API_KEY_PEPPER,
    tokenHashPepper: env.TOKEN_HASH_PEPPER,
    logLevel: env.LOG_LEVEL,
    personalDataRetentionDays: env.PERSONAL_DATA_RETENTION_DAYS,
    turnstile: {
      enabled: env.TURNSTILE_ENABLED,
      secretKey: env.TURNSTILE_SECRET_KEY,
    },
  };
}
