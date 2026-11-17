import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BrandKitService } from '../../core/brand-kit.service';
import { CardRepository } from '../../core/card-repository.service';
import { EMPTY_STATS, ProfileService } from '../../core/profile.service';
import { ToastService } from '../../core/toast.service';
import { Avatar, AVATARS } from '../../shared/ui/avatar';
import { Emoji } from '../../shared/ui/emoji';
import { Icon } from '../../shared/ui/icon';
import { TicketService, type Ticket } from '../support/ticket.service';

interface Badge {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  earned: boolean;
}

@Component({
  selector: 'app-profile-page',
  imports: [Avatar, Emoji, Icon, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="surface relative overflow-hidden p-6 md:p-8">
      <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_90%_0%,var(--hero-glow),transparent_70%)]" aria-hidden="true"></div>
      <div class="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        <app-avatar [name]="avatar()" [size]="104" alt="Your avatar" />
        <div class="min-w-0 flex-1">
          <p class="eyebrow">Profile</p>
          <h1 class="mt-1 truncate font-display text-5xl leading-tight text-ink">{{ displayName() }}</h1>
          <p class="mt-1 text-sm text-muted">
            {{ auth.user()?.email }}
            @if (auth.user()?.createdAt) {
              · Member since {{ auth.user()!.createdAt | date: 'MMMM y' }}
            }
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            @if (auth.isAdmin()) {
              <span class="chip"><app-icon name="crown" [size]="13" class="text-gilt" /> Owner</span>
            }
            @if (auth.user()?.emailVerified) {
              <span class="chip"><app-icon name="badge-check" [size]="13" class="text-success" /> Verified</span>
            }
          </div>
        </div>
        <a routerLink="/settings/account" class="btn btn-outline btn-sm self-start"><app-icon name="settings" [size]="15" /> Account settings</a>
      </div>
    </section>

    <div class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div class="grid gap-6">
        <section class="surface p-6" aria-labelledby="stats-title">
          <h2 id="stats-title" class="font-display text-3xl text-ink">Your stats</h2>
          <dl class="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            @for (s of statTiles(); track s.label) {
              <div class="rounded-2xl bg-surface-2 p-4">
                <dt class="text-xs uppercase tracking-[0.12em] text-muted">{{ s.label }}</dt>
                <dd class="mt-2 font-display text-4xl text-ink">{{ s.value }}</dd>
              </div>
            }
          </dl>
        </section>

        <section class="surface p-6" aria-labelledby="badges-title">
          <div class="flex items-end justify-between">
            <h2 id="badges-title" class="font-display text-3xl text-ink">Badges</h2>
            <span class="text-sm text-muted">{{ earnedCount() }}/{{ badges().length }} earned</span>
          </div>
          <ul class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            @for (b of badges(); track b.id) {
              <li class="flex flex-col items-center rounded-2xl border hairline p-4 text-center transition-opacity" [class.opacity-45]="!b.earned" [class.grayscale]="!b.earned">
                <app-emoji [name]="b.emoji" [size]="52" [alt]="b.title" />
                <p class="mt-3 text-sm font-semibold text-ink">{{ b.title }}</p>
                <p class="mt-0.5 text-xs text-muted">{{ b.hint }}</p>
                <span class="sr-only">{{ b.earned ? 'Earned' : 'Locked' }}</span>
              </li>
            }
          </ul>
        </section>
      </div>

      <div class="grid content-start gap-6">
        <section class="surface p-6" aria-labelledby="avatar-title">
          <h2 id="avatar-title" class="font-display text-3xl text-ink">Avatar</h2>
          <p class="mt-1 text-sm text-muted">Kabir, or one of the 3D animals.</p>
          <div class="mt-4 grid grid-cols-4 gap-3" role="radiogroup" aria-label="Choose avatar">
            @for (a of avatars; track a) {
              <button
                type="button"
                role="radio"
                [attr.aria-checked]="avatar() === a"
                [attr.aria-label]="label(a)"
                class="grid place-items-center rounded-2xl border-2 p-1.5 transition-transform duration-500 ease-[var(--ease-spring-bouncy)] hover:scale-105"
                [class.border-[var(--gilt)]]="avatar() === a"
                [class.border-transparent]="avatar() !== a"
                (click)="pick(a)"
              >
                <app-avatar [name]="a" [size]="54" />
              </button>
            }
          </div>
        </section>

        <section class="surface p-6" aria-labelledby="tickets-title">
          <h2 id="tickets-title" class="font-display text-3xl text-ink">Support tickets</h2>
          @if (tickets() === null) {
            <div class="skeleton mt-4 h-14"></div>
          } @else if (tickets()!.length) {
            <ul class="mt-4 grid gap-2">
              @for (t of tickets(); track t.id) {
                <li class="rounded-2xl border hairline px-4 py-3">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-mono text-xs text-muted">{{ t.id }}</span>
                    <span class="chip !h-6 !text-[0.7rem]">{{ t.status.replace('_', ' ') }}</span>
                  </div>
                  <p class="mt-1 truncate text-sm font-medium text-ink">{{ t.subject }}</p>
                </li>
              }
            </ul>
          } @else {
            <p class="mt-3 text-sm text-muted">No tickets yet. Ask Kabir and choose “Talk to a human” if you need help.</p>
          }
        </section>
      </div>
    </div>
  `,
})
export default class ProfilePage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly profile = inject(ProfileService);
  private readonly repo = inject(CardRepository);
  private readonly brandKit = inject(BrandKitService);
  private readonly ticketsSvc = inject(TicketService);
  private readonly toast = inject(ToastService);

  protected readonly avatars = AVATARS;
  protected readonly tickets = signal<Ticket[] | null>(null);
  protected readonly avatar = computed(() => this.profile.profile()?.avatar ?? 'kabir');
  protected readonly displayName = computed(() => this.profile.profile()?.displayName || this.auth.user()?.displayName || 'Your profile');
  private readonly stats = computed(() => this.profile.profile()?.stats ?? EMPTY_STATS);

  protected readonly statTiles = computed(() => [
    { label: 'Generated', value: this.stats().generated },
    { label: 'Saved', value: this.repo.cards().length },
    { label: 'Exported', value: this.stats().exported },
    { label: 'Favourites', value: this.repo.favourites().length },
  ]);

  protected readonly badges = computed<Badge[]>(() => {
    const s = this.stats();
    const saved = this.repo.cards().length;
    return [
      { id: 'first', emoji: 'sparkles', title: 'First spark', hint: 'Generate a card', earned: s.generated >= 1 },
      { id: 'curator', emoji: 'books', title: 'Curator', hint: 'Save 5 cards', earned: saved >= 5 },
      { id: 'prolific', emoji: 'fire', title: 'On fire', hint: 'Generate 25 cards', earned: s.generated >= 25 },
      { id: 'explorer', emoji: 'artist-palette', title: 'Template explorer', hint: 'Use 4 templates', earned: s.templatesUsed.length >= 4 },
      { id: 'brand', emoji: 'crown', title: 'Brand builder', hint: 'Fill your Brand Kit', earned: !this.brandKit.isEmpty() },
      { id: 'exporter', emoji: 'rocket', title: 'Shipped', hint: 'Export 5 times', earned: s.exported >= 5 },
      { id: 'fav', emoji: 'glowing-star', title: 'Favourite five', hint: 'Star 5 cards', earned: this.repo.favourites().length >= 5 },
      { id: 'gem', emoji: 'gem-stone', title: 'Hidden gem', hint: 'Generate 100 cards', earned: s.generated >= 100 },
    ];
  });
  protected readonly earnedCount = computed(() => this.badges().filter((b) => b.earned).length);

  ngOnInit(): void {
    this.ticketsSvc
      .listMine()
      .then((t) => this.tickets.set(t))
      .catch(() => this.tickets.set([]));
  }

  protected label(a: string): string {
    return a === 'kabir' ? 'Kabir' : a.replace(/-/g, ' ');
  }

  protected async pick(a: string): Promise<void> {
    try {
      await this.profile.update({ avatar: a });
      this.toast.success('Avatar updated');
    } catch {
      this.toast.error('Could not update avatar');
    }
  }
}
