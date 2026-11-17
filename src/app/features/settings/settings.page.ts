import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { APP_VERSION, LANGUAGES, TEMPLATES, TONES } from '../../../../shared/constants';
import { PUBLIC_ENV } from '../../../environments/public-env';
import { AuthService, authMessage } from '../../core/auth.service';
import { BrandKitService } from '../../core/brand-kit.service';
import { CardRepository } from '../../core/card-repository.service';
import { CookieConsentService } from '../../core/cookie-consent.service';
import { downloadBlob } from '../../core/platform';
import { ProfileService } from '../../core/profile.service';
import { SettingsService, type AppSettings, type ThemeChoice } from '../../core/settings.service';
import { SoundService } from '../../core/sound.service';
import { StorageService } from '../../core/storage.service';
import { ThemeService } from '../../core/theme.service';
import { ToastService } from '../../core/toast.service';
import { ShortcutsService } from '../../layout/shortcuts.service';
import { Segmented, Switch } from '../../shared/ui/controls';
import { Icon } from '../../shared/ui/icon';
import { SupportChatService } from '../support/support-chat.service';
import { SECTIONS, type SectionId } from './settings-registry';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, FormsModule, Icon, Switch, Segmented],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Settings</p>
        <h1 class="font-display text-5xl leading-tight text-ink">Make Vitrine yours</h1>
      </div>
      <div class="relative w-full max-w-sm">
        <app-icon name="search" [size]="17" class="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <label for="settings-search" class="sr-only">Search settings</label>
        <input id="settings-search" type="search" class="field !rounded-full !pl-11" placeholder="Search settings" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      </div>
    </div>

    @if (q().trim()) {
      <section class="surface mt-6 p-2" aria-label="Search results">
        @for (r of results(); track r.section.id + r.label) {
          <a [routerLink]="['/settings', r.section.id]" (click)="q.set('')" class="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface-2">
            <app-icon [name]="r.section.icon" [size]="17" class="text-gilt" />
            <span class="flex-1 text-sm text-ink">{{ r.label }}</span>
            <span class="text-xs text-muted">{{ r.section.label }}</span>
          </a>
        } @empty {
          <p class="px-4 py-6 text-center text-sm text-muted">No settings match “{{ q() }}”.</p>
        }
      </section>
    }

    <div class="mt-8 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Settings sections" class="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0">
        @for (s of sections; track s.id) {
          <a
            [routerLink]="['/settings', s.id]"
            class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-2"
            [class.!bg-surface]="s.id === active()"
            [class.shadow-lux]="s.id === active()"
            [class.!text-ink]="s.id === active()"
            [attr.aria-current]="s.id === active() ? 'page' : null"
          >
            <app-icon [name]="s.icon" [size]="17" [class.text-gilt]="s.id === active()" />
            {{ s.label }}
          </a>
        }
      </nav>

      <section class="surface min-w-0 p-6 md:p-8" [attr.aria-labelledby]="'sec-' + active()">
        <h2 [id]="'sec-' + active()" class="font-display text-3xl text-ink">{{ current().label }}</h2>
        <p class="mt-1 text-sm text-muted">{{ current().blurb }}</p>
        <div class="divider my-6"></div>

        @switch (active()) {
          @case ('account') {
            @if (auth.isSignedIn()) {
              <div class="grid gap-6">
                <div class="row">
                  <div><label for="display-name" class="row-title">Display name</label><p class="row-desc">Shown in your greeting and profile.</p></div>
                  <form class="flex gap-2" (submit)="saveName($event)">
                    <input id="display-name" class="field !min-h-10 !py-2" [ngModel]="name()" (ngModelChange)="name.set($event)" name="displayName" maxlength="60" />
                    <button type="submit" class="btn btn-outline btn-sm !h-10" [disabled]="!name().trim()">Save</button>
                  </form>
                </div>
                <div class="row">
                  <div><p class="row-title">Email address</p><p class="row-desc">{{ auth.user()?.email }} · {{ auth.user()?.emailVerified ? 'verified' : 'not verified' }}</p></div>
                  @if (!auth.user()?.emailVerified) {
                    <a routerLink="/auth/verify-email" class="btn btn-outline btn-sm">Verify</a>
                  }
                </div>
                @if (auth.hasPasswordProvider()) {
                  <form class="grid gap-3 rounded-2xl border hairline p-5" (submit)="changePassword($event)">
                    <p class="row-title">Change password</p>
                    <label for="pw-current" class="sr-only">Current password</label>
                    <input id="pw-current" type="password" class="field" placeholder="Current password" autocomplete="current-password" [ngModel]="pwCurrent()" (ngModelChange)="pwCurrent.set($event)" name="current" />
                    <label for="pw-next" class="sr-only">New password</label>
                    <input id="pw-next" type="password" class="field" placeholder="New password (8+ chars, letter and number)" autocomplete="new-password" [ngModel]="pwNext()" (ngModelChange)="pwNext.set($event)" name="next" />
                    <button type="submit" class="btn btn-primary btn-sm justify-self-start" [disabled]="!pwCurrent() || !strongPw()">Update password</button>
                  </form>
                }
                <div class="row">
                  <div><p class="row-title">Sign out</p><p class="row-desc">Sign out of this device.</p></div>
                  <button type="button" class="btn btn-outline btn-sm" (click)="signOut()"><app-icon name="log-out" [size]="15" /> Sign out</button>
                </div>
                  <div class="rounded-2xl border border-[color-mix(in_oklab,var(--danger)_35%,transparent)] p-5">
                    <p class="row-title text-danger">Delete account</p>
                    <p class="row-desc mt-1">Permanently deletes your login, profile, Brand Kit and every saved card. This cannot be undone. Export your data first if you want a copy.</p>
                    @if (!deleting()) {
                      <button type="button" class="btn btn-outline btn-sm mt-4 !border-[var(--danger)] !text-danger" (click)="deleting.set(true)">Delete my account…</button>
                    } @else {
                      <div class="mt-4 grid gap-3">
                        <label for="confirm-delete" class="text-sm text-ink-soft">Type <strong>DELETE</strong> to confirm</label>
                        <input id="confirm-delete" class="field" [ngModel]="confirmText()" (ngModelChange)="confirmText.set($event)" name="confirm" autocomplete="off" />
                        @if (auth.hasPasswordProvider()) {
                          <label for="delete-pw" class="sr-only">Password</label>
                          <input id="delete-pw" type="password" class="field" placeholder="Your password" [ngModel]="deletePw()" (ngModelChange)="deletePw.set($event)" name="deletePw" autocomplete="current-password" />
                        }
                        <div class="flex gap-2">
                          <button type="button" class="btn btn-ghost btn-sm" (click)="deleting.set(false)">Cancel</button>
                          <button type="button" class="btn btn-danger btn-sm" [disabled]="confirmText() !== 'DELETE' || busy()" (click)="deleteAccount()">Permanently delete</button>
                        </div>
                      </div>
                    }
                  </div>
              </div>
            } @else {
              <div class="rounded-2xl bg-surface-2 p-6">
                <p class="font-semibold text-ink">You are in guest mode</p>
                <p class="mt-1 text-sm text-muted">Cards and settings live in this browser only. Create a free account to sync across devices.</p>
                <div class="mt-4 flex gap-2">
                  <a routerLink="/auth/sign-up" class="btn btn-primary btn-sm">Create account</a>
                  <a routerLink="/auth/sign-in" class="btn btn-outline btn-sm">Sign in</a>
                </div>
              </div>
            }
          }
          @case ('appearance') {
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="radiogroup" aria-label="Theme">
              @for (t of themes; track t.id) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="s().theme === t.id"
                  (click)="theme.set(t.id)"
                  class="rounded-2xl border-2 p-3 text-left transition-transform duration-500 ease-[var(--ease-spring)] hover:-translate-y-0.5"
                  [class.border-[var(--gilt)]]="s().theme === t.id"
                  [class.border-[var(--line)]]="s().theme !== t.id"
                >
                  <span class="block h-20 overflow-hidden rounded-xl" [style.background]="t.bg">
                    <span class="m-3 block h-3 w-1/2 rounded-full" [style.background]="t.ink"></span>
                    <span class="mx-3 block h-2 w-3/4 rounded-full opacity-50" [style.background]="t.ink"></span>
                    <span class="m-3 block h-4 w-10 rounded-full" [style.background]="t.accent"></span>
                  </span>
                  <span class="mt-3 flex items-center justify-between text-sm font-semibold text-ink">{{ t.label }} @if (s().theme === t.id) {<app-icon name="check" [size]="16" class="text-gilt" />}</span>
                  <span class="text-xs text-muted">{{ t.desc }}</span>
                </button>
              }
            </div>
          }
          @case ('brand-kit') {
            <div class="row">
              <div><p class="row-title" id="bk-use">Use Brand Kit in generations</p><p class="row-desc">{{ brandKit.isEmpty() ? 'Your Brand Kit is empty.' : 'Brand voice and colours are added to every prompt.' }}</p></div>
              <app-switch label="Use Brand Kit in generations" [checked]="s().useBrandKit" (toggled)="set({ useBrandKit: $event })" />
            </div>
            <a routerLink="/brand-kit" class="btn btn-outline btn-sm mt-4">Edit Brand Kit <app-icon name="arrow-right" [size]="14" /></a>
          }
          @case ('generation') {
            <div class="grid gap-6">
              <div class="row-stack"><p class="row-title">Default tone</p><app-segmented label="Default tone" [options]="toneOptions" [value]="s().defaultTone" (changed)="set({ defaultTone: $event })" /></div>
              <div class="row">
                <div><label for="def-lang" class="row-title">Default language</label><p class="row-desc">Copy is written in this language.</p></div>
                <select id="def-lang" class="field !w-48" [ngModel]="s().defaultLanguage" (ngModelChange)="set({ defaultLanguage: $event })" name="lang">
                  @for (l of languages; track l.id) {
                    <option [value]="l.id">{{ l.label }}</option>
                  }
                </select>
              </div>
              <div class="row"><div><p class="row-title">Variations per generation</p><p class="row-desc">3 gives you different angles to compare.</p></div><app-segmented label="Variations" [options]="variationOptions" [value]="s().defaultVariations" (changed)="set({ defaultVariations: $event })" /></div>
              <div class="row"><div><p class="row-title">Creativity</p><p class="row-desc">Precise sticks to your inputs; Creative takes bolder swings.</p></div><app-segmented label="Creativity" [options]="creativityOptions" [value]="s().creativity" (changed)="set({ creativity: $event })" /></div>
              <div class="row"><div><p class="row-title">AI provider</p><p class="row-desc">Automatic tries Groq first and falls back to Gemini.</p></div><app-segmented label="AI provider" [options]="providerOptions" [value]="s().provider" (changed)="set({ provider: $event })" /></div>
            </div>
          }
          @case ('export') {
            <div class="grid gap-6">
              <div class="row">
                <div><label for="def-template" class="row-title">Default template</label><p class="row-desc">Used for new cards.</p></div>
                <select id="def-template" class="field !w-56" [ngModel]="s().defaultTemplate" (ngModelChange)="set({ defaultTemplate: $event })" name="tpl">
                  @for (t of templates; track t.id) {
                    <option [value]="t.id">{{ t.label }}</option>
                  }
                </select>
              </div>
              <div class="row"><div><p class="row-title">PNG export scale</p><p class="row-desc">Higher scale gives sharper images and bigger files.</p></div><app-segmented label="PNG scale" [options]="scaleOptions" [value]="s().exportScale" (changed)="set({ exportScale: $event })" /></div>
              <div class="row"><div><p class="row-title">“Made with Vitrine” watermark</p><p class="row-desc">A tiny mark on cards and PNG exports.</p></div><app-switch label="Watermark" [checked]="s().watermark" (toggled)="set({ watermark: $event })" /></div>
            </div>
          }
          @case ('privacy') {
            <div class="grid gap-6">
              <div class="row"><div><p class="row-title">Keep Studio draft</p><p class="row-desc">Remembers your current card between visits on this device.</p></div><app-switch label="Keep Studio draft" [checked]="s().keepHistory" (toggled)="set({ keepHistory: $event })" /></div>
              <div class="row"><div><p class="row-title">Export my data</p><p class="row-desc">Download your profile, settings, Brand Kit and cards as JSON.</p></div><button type="button" class="btn btn-outline btn-sm" (click)="exportData()"><app-icon name="download" [size]="15" /> Export JSON</button></div>
              <div class="row"><div><p class="row-title">Cookie settings</p><p class="row-desc">Currently: {{ cookies.choice()?.preferences ? 'essential + preferences' : 'essential only' }}.</p></div><button type="button" class="btn btn-outline btn-sm" (click)="cookies.openSettings()">Change</button></div>
              <div class="row"><div><p class="row-title">Clear local data</p><p class="row-desc">Removes guest cards, drafts, chat history and preferences from this browser ({{ usageKb() }} KB).</p></div><button type="button" class="btn btn-outline btn-sm !text-danger" (click)="clearLocal()">Clear</button></div>
              <p class="text-sm text-muted">Read the <a routerLink="/legal/privacy" class="link">Privacy Policy</a> and <a routerLink="/legal/cookies" class="link">Cookie Policy</a>.</p>
            </div>
          }
          @case ('notifications') {
            <div class="grid gap-6">
              <div class="row"><div><p class="row-title">Toast notifications</p><p class="row-desc">Small confirmations like “Saved”. Errors always show.</p></div><app-switch label="Toast notifications" [checked]="s().toasts" (toggled)="set({ toasts: $event })" /></div>
              <div class="row">
                <div><p class="row-title">Interface sounds</p><p class="row-desc">Soft chimes for success and errors.</p></div>
                <div class="flex items-center gap-2">
                  <button type="button" class="btn btn-ghost btn-sm" (click)="testSound()" [disabled]="!s().sounds"><app-icon name="volume" [size]="15" /> Test</button>
                  <app-switch label="Interface sounds" [checked]="s().sounds" (toggled)="set({ sounds: $event })" />
                </div>
              </div>
              <div class="row"><div><p class="row-title">Haptics</p><p class="row-desc">Gentle vibration on supported phones.</p></div><app-switch label="Haptics" [checked]="s().haptics" (toggled)="set({ haptics: $event })" /></div>
            </div>
          }
          @case ('accessibility') {
            <div class="grid gap-6">
              <div class="row"><div><p class="row-title">Reduce motion</p><p class="row-desc">Turns off animations and page transitions. We also follow your system setting.</p></div><app-switch label="Reduce motion" [checked]="s().reduceMotion" (toggled)="set({ reduceMotion: $event })" /></div>
              <div class="row"><div><p class="row-title">Larger text</p><p class="row-desc">Increases the base text size by about 12%.</p></div><app-switch label="Larger text" [checked]="s().largeText" (toggled)="set({ largeText: $event })" /></div>
              <div class="row"><div><p class="row-title">Strong focus outlines</p><p class="row-desc">Thicker, glowing outlines for keyboard navigation.</p></div><app-switch label="Strong focus outlines" [checked]="s().strongFocus" (toggled)="set({ strongFocus: $event })" /></div>
              <div class="row"><div><p class="row-title">Keyboard shortcuts</p><p class="row-desc">Press ? anywhere to see them.</p></div><button type="button" class="btn btn-outline btn-sm" (click)="shortcuts.showHelp()"><app-icon name="keyboard" [size]="15" /> View shortcuts</button></div>
            </div>
          }
          @case ('help') {
            <div class="grid gap-3 sm:grid-cols-3">
              <a routerLink="/help" class="rounded-2xl border hairline p-5 hover:border-[var(--gilt)]"><app-icon name="book-open" class="text-gilt" /><p class="mt-3 font-semibold text-ink">Help Center</p><p class="text-sm text-muted">Guides for every feature.</p></a>
              <button type="button" class="rounded-2xl border hairline p-5 text-left hover:border-[var(--gilt)]" (click)="chat.open.set(true)"><app-icon name="message" class="text-gilt" /><p class="mt-3 font-semibold text-ink">Ask Kabir</p><p class="text-sm text-muted">Instant answers from the Help Center.</p></button>
              <a routerLink="/help/contact-support" class="rounded-2xl border hairline p-5 hover:border-[var(--gilt)]"><app-icon name="lifebuoy" class="text-gilt" /><p class="mt-3 font-semibold text-ink">Contact support</p><p class="text-sm text-muted">Open a ticket with a human.</p></a>
            </div>
          }
          @case ('about') {
            <dl class="grid gap-4 text-sm sm:grid-cols-3">
              <div class="rounded-2xl bg-surface-2 p-4"><dt class="text-muted">Version</dt><dd class="mt-1 font-semibold text-ink">{{ version }}</dd></div>
              <div class="rounded-2xl bg-surface-2 p-4"><dt class="text-muted">Build</dt><dd class="mt-1 font-mono text-ink">{{ commit }}</dd></div>
              <div class="rounded-2xl bg-surface-2 p-4"><dt class="text-muted">Built</dt><dd class="mt-1 text-ink">{{ builtAt }}</dd></div>
            </dl>
            <div class="mt-6 grid gap-2 text-sm text-ink-soft">
              <p>Designed &amp; built by <strong class="text-ink">Bapan Ghosh</strong>. Source code under the MIT licence.</p>
              <p>3D emoji: Microsoft Fluent Emoji (MIT). Fonts: Instrument Serif and Geist (SIL Open Font Licence). Icons: Lucide (ISC).</p>
              <p>The Kabir mascot and the app-icon art were created with AI image tools. Product copy in the app is generated by Groq and Google Gemini models.</p>
            </div>
            <nav class="mt-6 flex flex-wrap gap-2" aria-label="Legal">
              <a routerLink="/legal/terms" class="chip">Terms</a>
              <a routerLink="/legal/privacy" class="chip">Privacy</a>
              <a routerLink="/legal/cookies" class="chip">Cookies</a>
              <a routerLink="/legal/ai-disclaimer" class="chip">AI Disclaimer</a>
              <a routerLink="/legal/acceptable-use" class="chip">Acceptable Use</a>
              <a [href]="repoUrl" target="_blank" rel="noopener noreferrer" class="chip"><app-icon name="github" [size]="13" /> GitHub</a>
            </nav>
          }
        }
      </section>
    </div>
  `,
  styles: `
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1.5rem;
    }
    .row-stack {
      display: grid;
      gap: 0.6rem;
    }
    .row-title {
      font-weight: 600;
      color: var(--ink);
      font-size: 0.95rem;
    }
    .row-desc {
      font-size: 0.82rem;
      color: var(--muted);
      max-width: 34rem;
    }
  `,
})
export default class SettingsPage {
  readonly section = input<string>();

  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly settings = inject(SettingsService);
  protected readonly brandKit = inject(BrandKitService);
  protected readonly cookies = inject(CookieConsentService);
  protected readonly shortcuts = inject(ShortcutsService);
  protected readonly chat = inject(SupportChatService);
  private readonly profile = inject(ProfileService);
  private readonly repo = inject(CardRepository);
  private readonly storage = inject(StorageService);
  private readonly sound = inject(SoundService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly sections = SECTIONS;
  protected readonly s = this.settings.settings;
  protected readonly q = signal('');
  protected readonly active = computed<SectionId>(() => (SECTIONS.find((x) => x.id === this.section())?.id ?? 'account'));
  protected readonly current = computed(() => SECTIONS.find((x) => x.id === this.active())!);
  protected readonly results = computed(() => {
    const q = this.q().trim().toLowerCase();
    if (!q) return [];
    return SECTIONS.flatMap((section) =>
      section.items.filter((i) => `${i.label} ${i.keywords} ${section.label}`.toLowerCase().includes(q)).map((i) => ({ section, label: i.label })),
    );
  });

  protected readonly name = signal(this.profile.profile()?.displayName ?? this.auth.user()?.displayName ?? '');
  protected readonly pwCurrent = signal('');
  protected readonly pwNext = signal('');
  protected readonly strongPw = computed(() => this.pwNext().length >= 8 && /[A-Za-z]/.test(this.pwNext()) && /\d/.test(this.pwNext()));
  protected readonly deleting = signal(false);
  protected readonly confirmText = signal('');
  protected readonly deletePw = signal('');
  protected readonly busy = signal(false);
  protected readonly usageKb = computed(() => Math.round(this.storage.usageBytes() / 1024));

  protected readonly themes: { id: ThemeChoice; label: string; desc: string; bg: string; ink: string; accent: string }[] = [
    { id: 'light', label: 'Light', desc: 'Warm ivory', bg: '#fbf7f0', ink: '#12201a', accent: '#0e4d3a' },
    { id: 'dark', label: 'Dark', desc: 'Emerald-black', bg: '#07130f', ink: '#f3eee3', accent: '#d6b672' },
    { id: 'oled', label: 'OLED', desc: 'True black', bg: '#000000', ink: '#f5f1e8', accent: '#d6b672' },
    { id: 'system', label: 'System', desc: 'Follows your device', bg: 'linear-gradient(135deg,#fbf7f0 50%,#07130f 50%)', ink: '#8f6e33', accent: '#c9a35b' },
  ];
  protected readonly toneOptions = TONES.map((t) => ({ value: t.id, label: t.label }));
  protected readonly languages = LANGUAGES;
  protected readonly templates = TEMPLATES;
  protected readonly variationOptions = [
    { value: 1 as const, label: '1' },
    { value: 3 as const, label: '3' },
  ];
  protected readonly creativityOptions = [
    { value: 'precise' as const, label: 'Precise' },
    { value: 'balanced' as const, label: 'Balanced' },
    { value: 'creative' as const, label: 'Creative' },
  ];
  protected readonly providerOptions = [
    { value: 'auto' as const, label: 'Automatic' },
    { value: 'groq' as const, label: 'Groq first' },
    { value: 'gemini' as const, label: 'Gemini first' },
  ];
  protected readonly scaleOptions = [
    { value: 1 as const, label: '1x' },
    { value: 2 as const, label: '2x' },
    { value: 3 as const, label: '3x' },
  ];
  protected readonly version = APP_VERSION;
  protected readonly commit = PUBLIC_ENV.commit;
  protected readonly builtAt = PUBLIC_ENV.builtAt.slice(0, 16).replace('T', ' ');
  protected readonly repoUrl = PUBLIC_ENV.repoUrl;

  protected set(patch: Partial<AppSettings>): void {
    this.settings.update(patch);
    this.toast.success('Setting saved');
  }

  protected testSound(): void {
    this.sound.play('success');
  }

  protected async saveName(e: Event): Promise<void> {
    e.preventDefault();
    const name = this.name().trim().slice(0, 60);
    if (!name) return;
    try {
      await this.auth.updateDisplayName(name);
      await this.profile.update({ displayName: name });
      this.toast.success('Name updated');
    } catch (err) {
      this.toast.error('Could not update name', authMessage(err));
    }
  }

  protected async changePassword(e: Event): Promise<void> {
    e.preventDefault();
    try {
      await this.auth.changePassword(this.pwCurrent(), this.pwNext());
      this.pwCurrent.set('');
      this.pwNext.set('');
      this.toast.success('Password updated');
    } catch (err) {
      this.toast.error('Could not update password', authMessage(err));
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.toast.info('Signed out');
    void this.router.navigateByUrl('/');
  }

  protected async deleteAccount(): Promise<void> {
    if (this.confirmText() !== 'DELETE') return;
    this.busy.set(true);
    try {
      await this.auth.reauthenticate(this.deletePw() || undefined);
      await this.repo.deleteAllCloud();
      await this.profile.deleteProfileDoc();
      await this.auth.deleteCurrentUser();
      this.storage.clearAll();
      this.toast.success('Account deleted', 'Your data has been permanently removed.');
      void this.router.navigateByUrl('/');
    } catch (err) {
      this.toast.error('Could not delete the account', authMessage(err));
    } finally {
      this.busy.set(false);
    }
  }

  protected exportData(): void {
    const data = {
      exportedAt: new Date().toISOString(),
      app: `Vitrine ${APP_VERSION}`,
      account: this.auth.user() ? { uid: this.auth.user()!.uid, email: this.auth.user()!.email, displayName: this.auth.user()!.displayName } : null,
      profile: this.profile.profile(),
      settings: this.settings.settings(),
      brandKit: this.brandKit.kit(),
      cards: this.repo.cards(),
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `vitrine-data-${new Date().toISOString().slice(0, 10)}.json`);
    this.toast.success('Your data was downloaded');
  }

  protected clearLocal(): void {
    if (!confirm('Clear all Vitrine data stored in this browser? Guest cards will be lost.')) return;
    this.storage.clearAll();
    location.reload();
  }
}
