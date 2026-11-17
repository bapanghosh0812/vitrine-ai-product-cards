import { defineConfig } from 'vitest/config';

/** Unit tests for the Hono API and shared server logic (Node environment). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.spec.ts'],
    reporters: ['default', 'json'],
    outputFile: { json: 'reports/raw/api-unit.json' },
    coverage: {
      provider: 'v8',
      include: ['server/**/*.ts'],
      exclude: ['server/**/*.spec.ts', 'server/dev.ts', 'server/entry-vercel.ts'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'reports/raw/coverage-api',
    },
  },
});
