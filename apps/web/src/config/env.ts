function requireEnv(value: string | undefined, name: string): string {
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Umgebungsvariable ${name} ist nicht gesetzt. Bitte .env.example nach .env.local kopieren.`,
    );
  }
  return value;
}

export const env = {
  apiBaseUrl: requireEnv(import.meta.env.VITE_API_BASE_URL, 'VITE_API_BASE_URL').replace(/\/+$/, ''),
  siteUrl: import.meta.env.VITE_SITE_URL ?? '',
  turnstileEnabled: import.meta.env.VITE_TURNSTILE_ENABLED === 'true',
  turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '',
};
