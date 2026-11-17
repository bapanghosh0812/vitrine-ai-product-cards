import { Injectable } from '@angular/core';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { PUBLIC_ENV } from '../../environments/public-env';
import { injectIsBrowser } from './platform';

export interface FirebaseSdk {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  authMod: typeof import('firebase/auth');
  fsMod: typeof import('firebase/firestore');
}

export function firebaseConfigured(): boolean {
  const f = PUBLIC_ENV.firebase;
  return !!(f.apiKey && f.authDomain && f.projectId && f.appId);
}

/**
 * Lazily loads the Firebase SDK (Auth + Firestore) only in the browser and only when
 * a web config is present. Public pages never download it, which keeps them fast.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private readonly browser = injectIsBrowser();
  readonly enabled = firebaseConfigured();
  private sdk: Promise<FirebaseSdk> | null = null;

  load(): Promise<FirebaseSdk> {
    if (!this.browser || !this.enabled) return Promise.reject(new Error('firebase-disabled'));
    this.sdk ??= (async () => {
      const [{ initializeApp, getApps }, authMod, fsMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = getApps()[0] ?? initializeApp({ ...PUBLIC_ENV.firebase });
      const auth = authMod.initializeAuth(app, {
        persistence: [authMod.indexedDBLocalPersistence, authMod.browserLocalPersistence],
        popupRedirectResolver: authMod.browserPopupRedirectResolver,
      });
      auth.useDeviceLanguage();
      let db: Firestore;
      try {
        db = fsMod.initializeFirestore(app, {
          localCache: fsMod.persistentLocalCache({ tabManager: fsMod.persistentMultipleTabManager() }),
        });
      } catch {
        db = fsMod.getFirestore(app);
      }
      return { app, auth, db, authMod, fsMod };
    })();
    return this.sdk;
  }
}
