#!/usr/bin/env node
/**
 * Bundles the Hono API into one self-contained ESM file (every dependency inlined).
 *
 *   node scripts/build-api.mjs --target vercel    -> .vercel/output/functions/api.func/ (Build Output API)
 *   node scripts/build-api.mjs --target netlify   -> dist/netlify/functions/api.mjs (deployed as-is)
 *
 * Bundling ourselves keeps both hosts identical and avoids runtime require() of ESM-only
 * packages (firebase-admin -> jwks-rsa -> jose), which older Lambda Node versions reject.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';

const arg = process.argv.indexOf('--target');
const target = arg > -1 ? process.argv[arg + 1] : 'vercel';
if (!['vercel', 'netlify'].includes(target)) throw new Error(`Unknown target: ${target}`);

const shared = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
  // Some CommonJS dependencies (firebase-admin, google-auth-library) call require().
  banner: {
    js: "import { createRequire as __vtCreateRequire } from 'node:module'; const require = __vtCreateRequire(import.meta.url);",
  },
};

let outDir;
let result;
if (target === 'vercel') {
  outDir = join('.vercel', 'output', 'functions', 'api.func');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  result = await build({ ...shared, entryPoints: ['server/entry-vercel.ts'], outfile: join(outDir, 'index.mjs') });
  writeFileSync(
    join(outDir, '.vc-config.json'),
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
  writeFileSync(join(outDir, 'package.json'), JSON.stringify({ type: 'module' }, null, 2));
} else {
  outDir = join('dist', 'netlify', 'functions');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  result = await build({ ...shared, entryPoints: ['netlify/functions/api.mts'], outfile: join(outDir, 'api.mjs') });
}

const bytes = Object.values(result.metafile.outputs).reduce((n, o) => n + o.bytes, 0);
console.log(`api bundle (${target}): ${(bytes / 1024).toFixed(0)} KB -> ${outDir}`);
