import { defineConfig } from 'vitest/config';

/** Firestore security rules tests. Requires the Firestore emulator (see package.json "test:rules"). */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.spec.ts'],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    reporters: ['default', 'json'],
    outputFile: { json: 'reports/raw/rules.json' },
  },
});
