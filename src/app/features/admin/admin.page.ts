import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui/icon';
import { TicketService, type Ticket } from '../support/ticket.service';

type Filter = 'all' | Ticket['status'];

/** Owner-only support inbox. Access is enforced by the admin custom claim in Firestore rules. */
@Component({
  selector: 'app-admin-page',
  imports: [Icon, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Owner</p>
        <h1 class="font-display text-5xl leading-tight text-ink">Support inbox</h1>
        <p class="mt-1 text-sm text-muted">{{ tickets().length }} tickets · {{ openCount() }} open</p>
      </div>
      <div class="flex gap-2">
        @for (f of filters; track f) {
          <button type="button" class="chip" [class.is-active]="filter() === f" [attr.aria-pressed]="filter() === f" (click)="filter.set(f)">{{ f.replace('_', ' ') }}</button>
        }
        <button type="button" class="icon-btn" (click)="load()" aria-label="Refresh"><app-icon name="refresh" [size]="17" /></button>
      </div>
    </div>

    @if (loading()) {
      <div class="mt-8 grid gap-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="skeleton h-20"></div>
        }
      </div>
    } @else if (error()) {
      <p class="surface mt-8 p-6 text-sm text-danger" role="alert">{{ error() }}</p>
    } @else {
      <ul class="mt-8 grid gap-3">
        @for (t of visible(); track t.id) {
          <li class="surface p-5">
            <button type="button" class="flex w-full items-start gap-4 text-left" (click)="open.set(open() === t.id ? '' : t.id)" [attr.aria-expanded]="open() === t.id">
              <span class="mt-1 size-2.5 shrink-0 rounded-full" [class]="t.status === 'open' ? 'bg-gold-500' : t.status === 'in_progress' ? 'bg-jade-400' : 'bg-[var(--line-strong)]'"></span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-x-3 text-xs text-muted">
                  <span class="font-mono">{{ t.id }}</span><span>{{ t.createdAt | date: 'd MMM y, h:mm a' }}</span><span>{{ t.email }}</span>
                </span>
                <span class="mt-1 block font-semibold text-ink">{{ t.subject }}</span>
              </span>
              <app-icon name="chevron-down" [size]="17" class="transition-transform" [class.rotate-180]="open() === t.id" />
            </button>
            @if (open() === t.id) {
              <div class="mt-4 grid gap-4 border-t hairline pt-4 text-sm">
                <p class="whitespace-pre-wrap text-ink-soft">{{ t.message }}</p>
                @if (t.transcript.length) {
                  <details class="rounded-2xl bg-surface-2 p-4">
                    <summary class="cursor-pointer font-medium text-ink">Chat transcript ({{ t.transcript.length }})</summary>
                    <ul class="mt-3 grid gap-2">
                      @for (m of t.transcript; track $index) {
                        <li><strong class="text-ink">{{ m.role === 'user' ? 'User' : 'Kabir' }}:</strong> <span class="text-ink-soft">{{ m.content }}</span></li>
                      }
                    </ul>
                  </details>
                }
                <p class="text-xs text-muted">Page: {{ t.page }} · {{ t.name || 'No name' }}</p>
                <div class="flex flex-wrap gap-2">
                  @for (s of statuses; track s) {
                    <button type="button" class="btn btn-sm" [class]="t.status === s ? 'btn-primary' : 'btn-outline'" (click)="setStatus(t, s)">{{ s.replace('_', ' ') }}</button>
                  }
                  <a class="btn btn-ghost btn-sm" [href]="'mailto:' + t.email + '?subject=' + encode('[' + t.id + '] ' + t.subject)"><app-icon name="mail" [size]="15" /> Reply</a>
                </div>
              </div>
            }
          </li>
        } @empty {
          <li class="surface p-10 text-center text-sm text-muted">No tickets here.</li>
        }
      </ul>
    }
  `,
})
export default class AdminPage implements OnInit {
  private readonly ticketsSvc = inject(TicketService);
  private readonly toast = inject(ToastService);
  protected readonly filters: Filter[] = ['all', 'open', 'in_progress', 'resolved'];
  protected readonly statuses: Ticket['status'][] = ['open', 'in_progress', 'resolved'];
  protected readonly tickets = signal<Ticket[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly filter = signal<Filter>('open');
  protected readonly open = signal('');
  protected readonly visible = computed(() => (this.filter() === 'all' ? this.tickets() : this.tickets().filter((t) => t.status === this.filter())));
  protected readonly openCount = computed(() => this.tickets().filter((t) => t.status === 'open').length);

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.tickets.set(await this.ticketsSvc.listAll());
    } catch {
      this.error.set('Could not load tickets. Make sure this account has the admin claim.');
    } finally {
      this.loading.set(false);
    }
  }

  protected async setStatus(t: Ticket, status: Ticket['status']): Promise<void> {
    try {
      await this.ticketsSvc.setStatus(t.id, status);
      this.tickets.update((list) => list.map((x) => (x.id === t.id ? { ...x, status } : x)));
      this.toast.success(`Ticket ${t.id} marked ${status.replace('_', ' ')}`);
    } catch {
      this.toast.error('Could not update ticket');
    }
  }

  protected encode(v: string): string {
    return encodeURIComponent(v);
  }
}
