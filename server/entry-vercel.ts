/**
 * Vercel Function entry (Node.js runtime). Bundled by scripts/build-vercel.mjs into
 * .vercel/output/functions/api.func/index.mjs using the Build Output API.
 */
import { getRequestListener } from '@hono/node-server';
import { createApp, normaliseRequest } from './app';

const app = createApp();

export default getRequestListener((request) => app.fetch(normaliseRequest(request)));
