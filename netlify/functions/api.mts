/**
 * Netlify Function (v2, Web-standard Request/Response). netlify.toml rewrites
 * /api/* to /.netlify/functions/api/:splat; normaliseRequest maps it back to /api/*.
 */
import { createApp, normaliseRequest } from '../../server/app';

const app = createApp();

export default async (request: Request): Promise<Response> => app.fetch(normaliseRequest(request));
