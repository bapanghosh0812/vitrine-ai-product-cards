import { computed, inject, Injectable, signal } from '@angular/core';
import type { User, UserCredential } from 'firebase/auth';
import { FirebaseService } from './firebase.service';
import { injectIsBrowser } from './platform';

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providers: string[];
  isAdmin: boolean;
  createdAt: string | null;
}

export type AuthStatus = 'unknown' | 'guest' | 'user';

export class AuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password do not match. Please try again.',
  'auth/wrong-password': 'That email and password do not match. Please try again.',
  'auth/user-not-found': 'That email and password do not match. Please try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Please choose a stronger password (at least 8 characters with a letter and a number).',
  'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
  'auth/network-request-failed': 'Network problem. Check your connection and try again.',
  'auth/popup-closed-by-user': 'The Google window was closed before signing in.',
  'auth/cancelled-popup-request': 'The Google window was closed before signing in.',
  'auth/requires-recent-login': 'For your security, please sign in again and then retry.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled yet.',
  'auth/unauthorized-domain': 'Google sign-in is not enabled for this website address yet.',
  'firebase-disabled': 'Accounts are not configured on this deployment. You can keep using Vitrine as a guest.',
};

export function authMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? (error as Error)?.message ?? '';
  return MESSAGES[code] ?? 'Something went wrong. Please try again.';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly firebase = inject(FirebaseService);
  private readonly browser = injectIsBrowser();

  private readonly _status = signal<AuthStatus>('unknown');
  private readonly _user = signal<SessionUser | null>(null);
  private started = false;

  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._status() === 'user');
  readonly isAdmin = computed(() => this._user()?.isAdmin === true);
  readonly enabled = this.firebase.enabled;

  /** Resolves once the first auth state is known. */
  private readyResolve!: () => void;
  readonly ready = new Promise<void>((r) => (this.readyResolve = r));

  init(): void {
    if (this.started || !this.browser) return;
    this.started = true;
    if (!this.firebase.enabled) {
      this._status.set('guest');
      this.readyResolve();
      return;
    }
    this.firebase
      .load()
      .then(({ auth, authMod }) => {
        authMod.getRedirectResult(auth).catch(() => undefined);
        authMod.onIdTokenChanged(auth, async (u) => {
          if (!u) {
            this._user.set(null);
            this._status.set('guest');
          } else {
            this._user.set(await this.toSession(u));
            this._status.set('user');
          }
          this.readyResolve();
        });
      })
      .catch(() => {
        this._status.set('guest');
        this.readyResolve();
      });
  }

  private async toSession(u: User, forceRefresh = false): Promise<SessionUser> {
    let claims: Record<string, unknown> = {};
    try {
      claims = (await u.getIdTokenResult(forceRefresh)).claims;
    } catch {
      /* offline: keep defaults */
    }
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName,
      photoURL: u.photoURL,
      emailVerified: u.emailVerified,
      providers: u.providerData.map((p) => p.providerId),
      isAdmin: claims['admin'] === true,
      createdAt: u.metadata.creationTime ?? null,
    };
  }

  private async sdk() {
    try {
      return await this.firebase.load();
    } catch {
      throw new AuthError('firebase-disabled', MESSAGES['firebase-disabled']!);
    }
  }

  async signIn(email: string, password: string): Promise<UserCredential> {
    const { auth, authMod } = await this.sdk();
    return authMod.signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async signUp(name: string, email: string, password: string): Promise<UserCredential> {
    const { auth, authMod } = await this.sdk();
    const cred = await authMod.createUserWithEmailAndPassword(auth, email.trim(), password);
    await authMod.updateProfile(cred.user, { displayName: name.trim().slice(0, 60) });
    try {
      await authMod.sendEmailVerification(cred.user, { url: `${location.origin}${this.basePath()}auth/verify-email` });
    } catch {
      /* can be resent from the verify page */
    }
    this._user.set(await this.toSession(cred.user, true));
    return cred;
  }

  async signInWithGoogle(): Promise<UserCredential | null> {
    const { auth, authMod } = await this.sdk();
    const provider = new authMod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      return await authMod.signInWithPopup(auth, provider);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await authMod.signInWithRedirect(auth, provider);
        return null;
      }
      throw error;
    }
  }

  async signOut(): Promise<void> {
    const { auth, authMod } = await this.sdk();
    await authMod.signOut(auth);
  }

  async sendVerification(): Promise<void> {
    const { auth, authMod } = await this.sdk();
    if (!auth.currentUser) throw new AuthError('no-user', 'Please sign in first.');
    await authMod.sendEmailVerification(auth.currentUser, { url: `${location.origin}${this.basePath()}auth/verify-email` });
  }

  async resetPassword(email: string): Promise<void> {
    const { auth, authMod } = await this.sdk();
    try {
      await authMod.sendPasswordResetEmail(auth, email.trim(), { url: `${location.origin}${this.basePath()}auth/sign-in` });
    } catch (error) {
      // Never reveal whether an account exists.
      if ((error as { code?: string }).code === 'auth/user-not-found') return;
      throw error;
    }
  }

  /** Re-reads the user (e.g. after clicking the verification link) and refreshes claims. */
  async refresh(): Promise<SessionUser | null> {
    const { auth } = await this.sdk();
    const u = auth.currentUser;
    if (!u) return null;
    await u.reload();
    const session = await this.toSession(u, true);
    this._user.set(session);
    return session;
  }

  async getIdToken(): Promise<string | null> {
    if (!this.isSignedIn()) return null;
    try {
      const { auth } = await this.firebase.load();
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }

  async updateDisplayName(name: string): Promise<void> {
    const { auth, authMod } = await this.sdk();
    if (!auth.currentUser) return;
    await authMod.updateProfile(auth.currentUser, { displayName: name.trim().slice(0, 60) });
    this._user.set(await this.toSession(auth.currentUser));
  }

  async changePassword(current: string, next: string): Promise<void> {
    const { auth, authMod } = await this.sdk();
    const u = auth.currentUser;
    if (!u?.email) throw new AuthError('no-user', 'Please sign in first.');
    await authMod.reauthenticateWithCredential(u, authMod.EmailAuthProvider.credential(u.email, current));
    await authMod.updatePassword(u, next);
  }

  /** Confirms identity right before a sensitive action (password for email users, Google popup otherwise). */
  async reauthenticate(password?: string): Promise<void> {
    const { auth, authMod } = await this.sdk();
    const u = auth.currentUser;
    if (!u) throw new AuthError('no-user', 'Please sign in first.');
    if (u.providerData.some((p) => p.providerId === 'password') && u.email) {
      if (!password) throw new AuthError('auth/missing-password', 'Please enter your password to continue.');
      await authMod.reauthenticateWithCredential(u, authMod.EmailAuthProvider.credential(u.email, password));
    } else if (u.providerData.some((p) => p.providerId === 'google.com')) {
      await authMod.reauthenticateWithPopup(u, new authMod.GoogleAuthProvider());
    }
  }

  /** Deletes the Firebase Auth user. Call reauthenticate() and remove Firestore data first. */
  async deleteCurrentUser(): Promise<void> {
    const { auth, authMod } = await this.sdk();
    const u = auth.currentUser;
    if (!u) return;
    await authMod.deleteUser(u);
  }

  hasPasswordProvider(): boolean {
    return this._user()?.providers.includes('password') ?? false;
  }

  private basePath(): string {
    const base = document.querySelector('base')?.getAttribute('href') ?? '/';
    return base.endsWith('/') ? base : `${base}/`;
  }
}
