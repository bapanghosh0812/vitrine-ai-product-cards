import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Firebase ID token verification.
 *
 * firebase-admin is initialised with the project id only. Verifying an ID token needs
 * nothing but Google's public signing keys, so no service account ever lives on the
 * API servers (Vercel / Netlify). The service account is used only by the local
 * scripts/set-admin-claim.mjs helper, never deployed.
 */
export interface Caller {
  uid: string;
  admin: boolean;
  emailVerified: boolean;
}

let app: App | null = null;

function adminApp(projectId: string): App {
  if (app) return app;
  app = getApps().find((a) => a.name === 'vitrine-verify') ?? initializeApp({ projectId }, 'vitrine-verify');
  return app;
}

export async function verifyBearer(header: string | undefined, projectId: string | undefined): Promise<Caller | null> {
  if (!header || !projectId) return null;
  const match = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/.exec(header.trim());
  if (!match?.[1]) return null;
  try {
    const decoded = await getAuth(adminApp(projectId)).verifyIdToken(match[1]);
    return {
      uid: decoded.uid,
      admin: decoded['admin'] === true,
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    return null;
  }
}
