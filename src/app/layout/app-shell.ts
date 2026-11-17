import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ProfileService } from '../core/profile.service';
import { ThemeService } from '../core/theme.service';
import { ToastService } from '../core/toast.service';
import { Avatar } from '../shared/ui/avatar';
import { Icon } from '../shared/ui/icon';
import { Logo } from '../shared/ui/logo';
import { CommandPaletteService } from './command-palette.service';
import { greeting, PRIMARY_NAV, SECONDARY_NAV } from './nav';
import { ShortcutsService } from './shortcuts.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon, Logo, Avatar, CdkMenuTrigger, CdkMenu, CdkMenuItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-h-dvh bg-bg bg-grain' },
  template: `
    <!-- Desktop sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 hidden flex-col border-r hairline bg-[var(--sidebar)] px-3 py-5 transition-[width] duration-500 ease-[var(--ease-spring)] lg:flex"
      [class.w-64]="!collapsed()"
      [class.w-[4.75rem]]="collapsed()"
      aria-label="Main"
    >
      <div class="flex items-center justify-between px-2">
        <a routerLink="/" class="rounded-xl" aria-label="Vitrine home"><app-logo [size]="34" [wordmark]="!collapsed()" /></a>
        @if (!collapsed()) {
          <button type="button" class="icon-btn size-8" (click)="collapsed.set(true)" aria-label="Collapse sidebar"><app-icon name="panel" [size]="17" /></button>
        }
      </div>
      @if (collapsed()) {
        <button type="button" class="icon-btn mx-auto mt-3 size-9" (click)="collapsed.set(false)" aria-label="Expand sidebar"><app-icon name="chevron-right" [size]="17" /></button>
      }

      <button
        type="button"
        class="btn btn-gold mt-6 w-full"
        [class.!px-0]="collapsed()"
        (click)="newCard()"
        [attr.aria-label]="collapsed() ? 'New card' : null"
      >
        <app-icon name="plus" [size]="17" />
        @if (!collapsed()) {
          <span>New card</span>
        }
      </button>

      <nav class="mt-6 flex flex-col gap-1" aria-label="Primary">
        @for (item of primary; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="is-active"
            #rla="routerLinkActive"
            [attr.aria-current]="rla.isActive ? 'page' : null"
            class="nav-link group flex h-11 items-center gap-3 rounded-xl px-3 text-[0.92rem] font-medium text-ink-soft transition-colors hover:bg-[color-mix(in_oklab,var(--accent)_7%,transparent)]"
            [title]="collapsed() ? item.label : ''"
          >
            <app-icon [name]="item.icon" [size]="19" />
            @if (!collapsed()) {
              <span class="flex-1">{{ item.label }}</span>
              <span class="kbd opacity-0 transition-opacity group-hover:opacity-100">{{ item.shortcut }}</span>
            }
          </a>
        }
      </nav>

      <div class="mt-auto flex flex-col gap-1">
        @if (auth.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="is-active" class="nav-link flex h-11 items-center gap-3 rounded-xl px-3 text-[0.92rem] font-medium text-ink-soft">
            <app-icon name="inbox" [size]="19" />
            @if (!collapsed()) {
              <span>Support inbox</span>
            }
          </a>
        }
        @for (item of secondary; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="is-active"
            class="nav-link flex h-11 items-center gap-3 rounded-xl px-3 text-[0.92rem] font-medium text-ink-soft hover:bg-[color-mix(in_oklab,var(--accent)_7%,transparent)]"
            [title]="collapsed() ? item.label : ''"
          >
            <app-icon [name]="item.icon" [size]="19" />
            @if (!collapsed()) {
              <span>{{ item.label }}</span>
            }
          </a>
        }
        @if (!collapsed()) {
          <p class="mt-4 px-3 text-[0.72rem] leading-relaxed text-muted">Designed &amp; built by <span class="font-semibold text-ink-soft">Bapan Ghosh</span></p>
        }
      </div>
    </aside>

    <div class="transition-[padding] duration-500 ease-[var(--ease-spring)]" [class.lg:pl-64]="!collapsed()" [class.lg:pl-[4.75rem]]="collapsed()">
      <!-- Top bar -->
      <header class="glass sticky top-0 z-30 border-x-0 border-t-0">
        <div class="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 md:px-6">
          <a routerLink="/" class="lg:hidden" aria-label="Vitrine home"><app-logo [size]="30" [wordmark]="false" /></a>
          <div class="flex min-w-0 items-center gap-3">
            <img src="brand/kabir-head.webp" alt="" width="36" height="36" class="hidden size-9 rounded-full bg-[radial-gradient(circle_at_50%_30%,#f6e3ae,#c9a35b)] object-cover sm:block" />
            <div class="min-w-0">
              <p class="truncate font-display text-[1.35rem] leading-tight text-ink">{{ hello() }}, {{ firstName() }}</p>
              <p class="hidden truncate text-xs text-muted sm:block">{{ subline() }}</p>
            </div>
          </div>

          <div class="ml-auto flex items-center gap-1.5">
            <button type="button" class="btn btn-outline btn-sm hidden gap-2 md:inline-flex" (click)="palette.open()" aria-label="Open command palette">
              <app-icon name="search" [size]="15" />
              <span class="text-muted">Search or jump to…</span>
              <span class="kbd ml-3">{{ mod }}K</span>
            </button>
            <button type="button" class="icon-btn md:hidden" (click)="palette.open()" aria-label="Open command palette"><app-icon name="search" [size]="19" /></button>
            <button type="button" class="icon-btn" (click)="theme.cycle()" [attr.aria-label]="'Theme: ' + theme.choice() + '. Change theme'" [title]="'Theme: ' + theme.choice()">
              <app-icon [name]="themeIcon()" [size]="19" />
            </button>

            @if (auth.status() === 'unknown') {
              <span class="skeleton size-9 rounded-full"></span>
            } @else {
              <button
                type="button"
                class="rounded-full ring-offset-2 ring-offset-[var(--bg)] transition-transform duration-300 hover:scale-105"
                [cdkMenuTriggerFor]="menu"
                aria-label="Account menu"
              >
                <app-avatar [name]="profile.profile()?.avatar ?? 'kabir'" [size]="36" />
              </button>
            }
            <ng-template #menu>
              <div cdkMenu class="glass shadow-float mt-2 w-64 animate-pop rounded-2xl p-2">
                <div class="px-3 py-2.5">
                  <p class="truncate text-sm font-semibold text-ink">{{ auth.user()?.displayName || (auth.isSignedIn() ? 'Your account' : 'Guest mode') }}</p>
                  <p class="truncate text-xs text-muted">{{ auth.user()?.email || 'Cards are saved in this browser' }}</p>
                  @if (auth.isDemo()) {
                    <span class="chip mt-2 !h-6 !text-[0.7rem]">Demo account · resets hourly</span>
                  }
                </div>
                <div class="divider my-1"></div>
                @if (auth.isSignedIn()) {
                  <button cdkMenuItem class="menu-item" (click)="go('/profile')"><app-icon name="user" [size]="16" /> Profile</button>
                }
                <button cdkMenuItem class="menu-item" (click)="go('/settings')"><app-icon name="settings" [size]="16" /> Settings</button>
                <button cdkMenuItem class="menu-item" (click)="go('/help')"><app-icon name="help" [size]="16" /> Help Center</button>
                <button cdkMenuItem class="menu-item" (click)="shortcuts.showHelp()"><app-icon name="keyboard" [size]="16" /> Keyboard shortcuts</button>
                <div class="divider my-1"></div>
                @if (auth.isSignedIn()) {
                  <button cdkMenuItem class="menu-item" (click)="signOut()"><app-icon name="log-out" [size]="16" /> Sign out</button>
                } @else {
                  <button cdkMenuItem class="menu-item" (click)="go('/auth/sign-in')"><app-icon name="log-in" [size]="16" /> Sign in</button>
                  <button cdkMenuItem class="menu-item font-semibold text-accent" (click)="go('/auth/sign-up')"><app-icon name="sparkles" [size]="16" /> Create free account</button>
                }
              </div>
            </ng-template>
          </div>
        </div>
      </header>

      <main id="main" tabindex="-1" class="mx-auto max-w-[1500px] px-4 pb-32 pt-6 outline-none md:px-6 lg:pb-12">
        <router-outlet />
      </main>
    </div>

    <!-- Mobile bottom nav -->
    <nav class="glass safe-bottom fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 lg:hidden" aria-label="Primary">
      <ul class="mx-auto grid h-16 max-w-md grid-cols-5">
        @for (item of mobile; track item.path) {
          <li>
            <a
              [routerLink]="item.path"
              routerLinkActive="text-accent"
              #m="routerLinkActive"
              [attr.aria-current]="m.isActive ? 'page' : null"
              class="flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] font-medium text-muted transition-transform active:scale-95"
            >
              <span class="grid h-7 w-12 place-items-center rounded-full transition-colors" [class.bg-[color-mix(in_oklab,var(--accent)_12%,transparent)]]="m.isActive">
                <app-icon [name]="item.icon" [size]="20" />
              </span>
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: `
    .nav-link.is-active {
      background: color-mix(in oklab, var(--accent) 10%, transparent);
      color: var(--ink);
      box-shadow: inset 2px 0 0 var(--gilt);
    }
    .menu-item {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.65rem;
      height: 2.5rem;
      padding: 0 0.75rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      color: var(--ink-soft);
      outline: none;
    }
    .menu-item:hover,
    .menu-item:focus {
      background: color-mix(in oklab, var(--accent) 8%, transparent);
      color: var(--ink);
    }
  `,
})
export default class AppShell {
  protected readonly auth = inject(AuthService);
  protected readonly profile = inject(ProfileService);
  protected readonly theme = inject(ThemeService);
  protected readonly palette = inject(CommandPaletteService);
  protected readonly shortcuts = inject(ShortcutsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly primary = PRIMARY_NAV;
  protected readonly secondary = SECONDARY_NAV;
  protected readonly mobile = [...PRIMARY_NAV, { label: 'Settings', path: '/settings', icon: 'settings' as const }].map((i) =>
    i.label === 'Brand Kit' ? { ...i, label: 'Brand' } : i,
  );
  protected readonly collapsed = signal(false);
  protected readonly mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl ';
  protected readonly hello = signal(greeting());

  protected readonly firstName = computed(() => {
    const name = this.profile.profile()?.displayName || this.auth.user()?.displayName;
    if (name) return name.split(' ')[0];
    return this.auth.isSignedIn() ? 'there' : 'friend';
  });
  protected readonly subline = computed(() =>
    this.auth.isDemo()
      ? 'You are exploring the demo account. Changes reset every hour.'
      : this.auth.isSignedIn()
        ? 'Your cards sync across devices.'
        : 'Guest mode: cards stay in this browser. Sign in to sync.',
  );
  protected readonly themeIcon = computed(() => {
    const c = this.theme.choice();
    return c === 'light' ? 'sun' : c === 'dark' ? 'moon' : c === 'oled' ? 'moon-star' : 'monitor';
  });

  constructor() {
    this.shortcuts.attach();
  }

  protected go(path: string): void {
    void this.router.navigateByUrl(path);
  }

  protected newCard(): void {
    void this.router.navigate(['/studio'], { queryParams: { new: 1 } });
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    this.toast.info('Signed out', 'See you soon.');
    void this.router.navigateByUrl('/');
  }
}
