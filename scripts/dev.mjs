#!/usr/bin/env node
/**
 * Local development: runs the Hono API (http://localhost:8787) and the Angular dev
 * server (http://localhost:4200, proxies /api) side by side. Ctrl+C stops both.
 * Set AI_MOCK=1 in .env.local to work without AI keys.
 */
import { spawn } from 'node:child_process';

const node = process.execPath;
const procs = [
  { name: 'api', color: 33, args: ['node_modules/tsx/dist/cli.mjs', 'watch', 'server/dev.ts'] },
  { name: 'web', color: 32, args: ['node_modules/@angular/cli/bin/ng.js', 'serve', '--port', '4200'] },
];

const children = procs.map(({ name, color, args }) => {
  const child = spawn(node, args, { stdio: ['inherit', 'pipe', 'pipe'], env: process.env });
  const prefix = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (stream, out) =>
    stream.on('data', (buf) =>
      out.write(
        buf
          .toString()
          .split(/\r?\n/)
          .filter((l) => l.length)
          .map((l) => prefix + l)
          .join('\n') + '\n',
      ),
    );
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on('exit', (code) => {
    console.log(`${prefix}exited with code ${code}`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const c of children) if (!c.killed) c.kill();
  setTimeout(() => process.exit(code), 300);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
