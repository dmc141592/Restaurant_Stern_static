import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Integration tests share one Postgres container and mutate common
    // tables; running files in parallel would make them interfere with
    // each other, so they run sequentially within a single process.
    fileParallelism: false,
  },
});
