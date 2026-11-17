#!/usr/bin/env node
/**
 * Bundles the Hono API into a single ESM file for the Vercel Build Output API.
 *
 *   node scripts/build-api.mjs --target vercel
 *
 * Output: .vercel/output/functions/api.func/{index.mjs,.vc-config.json,package.json}
 * Netlify bundles netlify/functions/api.mts itself (esbuild), so it needs no step here.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const FUNC = join('.vercel', 'output', 'functions', 'api.func');
rmSync(FUNC, { recursive: true, force: true });
mkdirSync(FUNC, { recursive: true });

const result = await build({
  entryPoints: ['server/entry-vercel.ts'],
  outfile: join(FUNC, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
  // Some CommonJS dependencies (firebase-admin, google-auth-library) call require().
  banner: {
    js: "import { createRequire as __vtCreateRequire } from 'node:module'; const require = __vtCreateRequire(import.meta.url);",
  },
});

writeFileSync(
  join(FUNC, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs22.x',
      handler: 'index.mjs',
      launcherType: 'Nodejs',
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      maxDuration: 30,
    },
    null,
    2,
  ),
);
writeFileSync(join(FUNC, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));

const bytes = Object.values(result.metafile.outputs).reduce((n, o) => n + o.bytes, 0);
console.log(`api bundle: ${(bytes / 1024).toFixed(0)} KB -> ${FUNC}`);
