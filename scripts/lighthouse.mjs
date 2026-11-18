#!/usr/bin/env node
/**
 * Runs Lighthouse (mobile + desktop) against a running production-like server and writes
 * reports/raw/lighthouse.json.  Start the server first:
 *   PORT=4176 APPLY_HEADERS=1 npx tsx scripts/serve-dist.ts
 *   node scripts/lighthouse.mjs http://localhost:4176
 * Uses Playwright's Chromium so no system Chrome is required.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from '@playwright/test';

const base = (process.argv[2] ?? 'http://localhost:4176').replace(/\/+$/, '');
const pages = ['/', '/studio', '/help', '/legal/privacy'];

// Prefer CHROME_PATH; otherwise Playwright's headless shell (the full Chromium build can be
// blocked by OS application policies on some Windows machines).
const full = chromium.executablePath();
const shell = full.replace(/chromium-(\d+)[\\/]chrome-win64[\\/]chrome\.exe$/, 'chromium_headless_shell-$1/chrome-headless-shell-win64/chrome-headless-shell.exe');
const chromePath = process.env.CHROME_PATH || (existsSync(shell) ? shell : full);

// Run npx through node directly (no shell), so flags with spaces stay intact.
const npxCli = [join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js'), join(dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js')].find(existsSync);
if (!npxCli) throw new Error('npx-cli.js not found next to node');

mkdirSync('reports/raw/lighthouse', { recursive: true });
// Lighthouse scores vary between runs (CPU load, thermals, power source), so each page runs
// RUNS times and the run with the median performance score is reported, as Lighthouse recommends.
const RUNS = Math.max(1, Number(process.env.LH_RUNS ?? 3));
const results = [];
for (const preset of ['mobile', 'desktop']) {
  for (const path of pages) {
    const out = `reports/raw/lighthouse/${preset}${path === '/' ? '-home' : path.replace(/\//g, '-')}.json`;
    const runs = [];
    for (let run = 0; run < RUNS; run++) {
    execFileSync(
      process.execPath,
      [
        npxCli,
        '-y',
        'lighthouse@13.6.0',
        `${base}${path}`,
        '--quiet',
        '--output=json',
        `--output-path=${out}`,
        '--only-categories=performance,accessibility,best-practices,seo',
        '--chrome-flags=--headless --no-sandbox',
        '--max-wait-for-load=45000',
        ...(preset === 'desktop' ? ['--preset=desktop'] : []),
      ],
      { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chromePath } },
    );
      runs.push(readFileSync(out, 'utf8'));
    }
    const parsed = runs.map((text) => JSON.parse(text)).sort((a, b) => (a.categories.performance?.score ?? 0) - (b.categories.performance?.score ?? 0));
    const lhr = parsed[Math.floor(parsed.length / 2)];
    writeFileSync(out, JSON.stringify(lhr));
    const allPerf = parsed.map((r) => Math.round((r.categories.performance?.score ?? 0) * 100));
    const score = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
    const row = {
      preset,
      path,
      performance: score('performance'),
      accessibility: score('accessibility'),
      bestPractices: score('best-practices'),
      seo: score('seo'),
      lcpMs: Math.round(lhr.audits['largest-contentful-paint']?.numericValue ?? 0),
      cls: Number((lhr.audits['cumulative-layout-shift']?.numericValue ?? 0).toFixed(3)),
      tbtMs: Math.round(lhr.audits['total-blocking-time']?.numericValue ?? 0),
      runs: allPerf,
    };
    results.push(row);
    console.log(JSON.stringify(row));
  }
}
writeFileSync('reports/raw/lighthouse.json', JSON.stringify({ ranAt: new Date().toISOString(), base, runsPerPage: RUNS, chrome: chromePath.split(/[\\/]/).at(-1), results }, null, 2));
console.log('lighthouse: reports/raw/lighthouse.json');
