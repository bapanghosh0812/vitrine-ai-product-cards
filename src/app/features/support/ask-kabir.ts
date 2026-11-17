import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LIMITS, SUPPORT_ACTIONS, type SupportActionId } from '../../../../shared/constants';
import { PUBLIC_ENV } from '../../../environments/public-env';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { ToastService } from '../../core/toast.service';
import { renderMiniMarkdown, stripActionMarker } from '../../shared/mini-markdown';
import { Icon } from '../../shared/ui/icon';
import { SUGGESTED_QUESTIONS, SupportChatService, type ChatMessage } from './support-chat.service';
import { TicketService } from './ticket.service';

@Component({
  selector: 'app-ask-kabir',
  imports: [A11yModule, Icon, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Launcher -->
    @if (!chat.open()) {
      <button
        type="button"
        class="launcher fixed bottom-24 right-4 z-[60] flex items-center gap-2 rounded-full p-1.5 pr-4 shadow-float lg:bottom-6 lg:right-6"
        (click)="openPanel()"
        aria-label="Ask Kabir, the support assistant"
        data-testid="kabir-launcher"
      >
        <span class="relative grid size-11 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_30%,#f6e3ae,#c9a35b_60%,#8f6e33)] ring-2 ring-[rgb(255_255_255/0.6)]">
          <img src="brand/kabir-head.webp" alt="" width="44" height="44" class="size-11 translate-y-0.5 object-cover" />
        </span>
        <span class="text-sm font-semibold">Ask Kabir</span>
        @if (chat.unread()) {
          <span class="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-[var(--bg)] bg-danger" aria-label="New reply"></span>
        }
      </button>
    }

    <!-- Panel -->
    @if (chat.open()) {
      <section
        role="dialog"
        aria-modal="false"
        aria-labelledby="kabir-title"
        class="glass shadow-float fixed inset-x-0 bottom-0 z-[75] flex h-[88dvh] flex-col overflow-hidden rounded-t-[1.75rem] animate-rise sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(42rem,calc(100dvh-3rem))] sm:w-[25rem] sm:rounded-[1.75rem]"
        cdkTrapFocus
        (keydown.escape)="close()"
        data-testid="kabir-panel"
      >
        <header class="flex items-center gap-3 border-b hairline px-4 py-3">
          <span class="grid size-10 place-items-center overflow-hidden rounded-full bg-[radial-gradient(circle_at_50%_30%,#f6e3ae,#c9a35b_60%,#8f6e33)]">
            <img src="brand/kabir-head.webp" alt="" width="40" height="40" class="size-10 translate-y-0.5 object-cover" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 id="kabir-title" class="font-display text-xl leading-tight text-ink">Ask Kabir</h2>
            <p class="flex items-center gap-1.5 text-xs text-muted"><span class="size-1.5 rounded-full bg-success"></span> Answers from the Help Center</p>
          </div>
          @if (chat.view() === 'chat' && !chat.isEmpty()) {
            <button type="button" class="icon-btn size-9" (click)="chat.reset()" aria-label="Start a new conversation" title="New conversation"><app-icon name="refresh" [size]="16" /></button>
          }
          <button type="button" class="icon-btn size-9" (click)="close()" aria-label="Close Ask Kabir"><app-icon name="x" [size]="18" /></button>
        </header>

        @if (chat.view() === 'chat') {
          <div #scroller class="scrollbar-thin flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions text" (click)="onContentClick($event)">
            @if (chat.isEmpty()) {
              <div class="animate-fade">
                <div class="flex items-end gap-3">
                  <img src="brand/kabir-bust.webp" alt="" width="96" height="116" class="h-28 w-auto drop-shadow-lg" />
                  <div class="mb-3 rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-sm text-ink-soft shadow-lux">
                    Hi{{ name() ? ', ' + name() : '' }}! I'm Kabir. Ask me anything about using Vitrine.
                  </div>
                </div>
                <p class="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Popular questions</p>
                <div class="flex flex-col gap-2">
                  @for (q of suggestions; track q) {
                    <button type="button" class="rounded-2xl border hairline bg-surface px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:border-[var(--gilt)]" (click)="send(q)">{{ q }}</button>
                  }
                </div>
              </div>
            }
            <ul class="flex flex-col gap-4">
              @for (m of chat.messages(); track m.id) {
                <li [class]="m.role === 'user' ? 'flex justify-end' : 'flex gap-2'" [attr.data-role]="m.role">
                  @if (m.role === 'user') {
                    <p class="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm text-accent-ink">{{ m.content }}</p>
                  } @else {
                    <img src="brand/kabir-head.webp" alt="" width="28" height="28" class="mt-1 size-7 shrink-0 rounded-full bg-[radial-gradient(circle_at_50%_30%,#f6e3ae,#c9a35b)]" />
                    <div class="min-w-0 max-w-[88%]">
                      <div class="rounded-2xl rounded-tl-md bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft shadow-lux" [class.!text-danger]="m.status === 'error'">
                        @if (!m.content && m.status === 'streaming') {
                          <span class="flex gap-1 py-1" aria-label="Kabir is typing"><span class="dot"></span><span class="dot [animation-delay:.15s]"></span><span class="dot [animation-delay:.3s]"></span></span>
                        } @else {
                          <div class="prose-chat" [innerHTML]="render(m)"></div>
                          @if (m.status === 'streaming') {
                            <span class="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-gilt align-middle"></span>
                          }
                        }
                        @if (m.fallback?.length) {
                          <ul class="mt-2 grid gap-2">
                            @for (a of m.fallback; track a.slug) {
                              <li>
                                <a [routerLink]="['/help', a.slug]" (click)="close()" class="block rounded-xl border hairline px-3 py-2 hover:border-[var(--gilt)]">
                                  <span class="block text-sm font-semibold text-ink">{{ a.title }}</span>
                                  <span class="block text-xs text-muted">{{ a.snippet }}</span>
                                </a>
                              </li>
                            }
                          </ul>
                        }
                      </div>
                      @if (m.status === 'done' && m.sources?.length && !m.fallback) {
                        <p class="mt-1.5 flex flex-wrap items-center gap-1 text-[0.7rem] text-muted">
                          Sources:
                          @for (s of m.sources; track s.slug) {
                            <a [routerLink]="['/help', s.slug]" (click)="close()" class="underline decoration-dotted underline-offset-2 hover:text-ink">{{ s.title }}</a>
                          }
                        </p>
                      }
                      @if (m.status === 'done' && m.actions?.length) {
                        <div class="mt-2 flex flex-wrap gap-1.5">
                          @for (a of m.actions; track a) {
                            <button type="button" class="chip hover:border-[var(--gilt)]" (click)="runAction(a)">{{ actionLabel(a) }} <app-icon name="arrow-right" [size]="12" /></button>
                          }
                        </div>
                      }
                      @if (m.status === 'done' && m.content) {
                        <div class="mt-1 flex items-center gap-0.5 text-muted">
                          <button type="button" class="icon-btn size-7" (click)="copy(m)" aria-label="Copy answer" title="Copy"><app-icon name="copy" [size]="13" /></button>
                          <button type="button" class="icon-btn size-7" [class.!text-success]="m.feedback === 'up'" (click)="rate(m, 'up')" [attr.aria-pressed]="m.feedback === 'up'" aria-label="Helpful"><app-icon name="thumbs-up" [size]="13" /></button>
                          <button type="button" class="icon-btn size-7" [class.!text-danger]="m.feedback === 'down'" (click)="rate(m, 'down')" [attr.aria-pressed]="m.feedback === 'down'" aria-label="Not helpful"><app-icon name="thumbs-down" [size]="13" /></button>
                        </div>
                      }
                    </div>
                  }
                </li>
              }
            </ul>
          </div>

          <footer class="border-t hairline p-3">
            <form class="flex items-end gap-2" (submit)="submit($event)">
              <label for="kabir-input" class="sr-only">Your question</label>
              <textarea
                #input
                id="kabir-input"
                rows="1"
                class="field scrollbar-thin max-h-32 min-h-11 flex-1 resize-none !rounded-2xl !py-2.5 text-sm"
                placeholder="Ask about Vitrine…"
                [value]="draft()"
                (input)="draft.set($any($event.target).value)"
                (keydown.enter)="enter($event)"
                [attr.maxlength]="max"
                data-testid="kabir-input"
              ></textarea>
              @if (chat.busy()) {
                <button type="button" class="btn btn-outline !size-11 !p-0" (click)="chat.stop()" aria-label="Stop answering"><span class="size-3 rounded-sm bg-current"></span></button>
              } @else {
                <button type="submit" class="btn btn-primary !size-11 !p-0" [disabled]="!draft().trim()" aria-label="Send"><app-icon name="send" [size]="17" /></button>
              }
            </form>
            <div class="mt-2 flex items-center justify-between px-1 text-[0.7rem] text-muted">
              <button type="button" class="font-medium text-accent hover:underline" (click)="chat.view.set('ticket')"><app-icon name="lifebuoy" [size]="12" /> Talk to a human</button>
              <span class="tabular-nums" [class.text-danger]="draft().length > max - 40">{{ draft().length }}/{{ max }}</span>
            </div>
          </footer>
        } @else {
          <!-- Ticket form -->
          <div class="scrollbar-thin flex-1 overflow-y-auto px-5 py-5">
            <button type="button" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink" (click)="chat.view.set('chat'); ticketDone.set('')"><app-icon name="arrow-left" [size]="15" /> Back to chat</button>
            @if (ticketDone()) {
              <div class="text-center animate-rise">
                <p class="eyebrow">Ticket created</p>
                <p class="mt-2 font-display text-4xl text-ink" data-testid="ticket-id">{{ ticketDone() }}</p>
                <p class="mt-3 text-sm text-muted">Thanks! A human from the Vitrine team will reply to {{ auth.user()?.email }}. Keep this ID for reference.</p>
              </div>
            } @else if (!auth.isSignedIn()) {
              <h3 class="font-display text-2xl text-ink">Talk to a human</h3>
              <p class="mt-2 text-sm text-muted">Please sign in so we can reply to your account email. You can also report an issue publicly on GitHub.</p>
              <div class="mt-5 flex flex-col gap-2">
                <a routerLink="/auth/sign-in" (click)="close()" class="btn btn-primary">Sign in</a>
                <a [href]="repo + '/issues/new'" target="_blank" rel="noopener noreferrer" class="btn btn-outline"><app-icon name="github" [size]="16" /> Open a GitHub issue</a>
              </div>
            } @else {
              <h3 class="font-display text-2xl text-ink">Talk to a human</h3>
              <p class="mt-1 text-sm text-muted">We will reply to <strong class="text-ink-soft">{{ auth.user()?.email }}</strong>. Never include passwords.</p>
              <form [formGroup]="ticket" (ngSubmit)="createTicket()" class="mt-5 grid gap-4" novalidate>
                <div>
                  <label for="t-subject" class="field-label">Subject</label>
                  <input id="t-subject" class="field" formControlName="subject" [attr.maxlength]="limits.ticketSubjectMax" [attr.aria-invalid]="ticket.controls.subject.invalid && ticket.controls.subject.touched" />
                </div>
                <div>
                  <label for="t-message" class="field-label">How can we help?</label>
                  <textarea id="t-message" rows="5" class="field" formControlName="message" [attr.maxlength]="limits.ticketMessageMax" [attr.aria-invalid]="ticket.controls.message.invalid && ticket.controls.message.touched"></textarea>
                </div>
                <label class="flex items-center gap-2 text-sm text-ink-soft"><input type="checkbox" class="size-4 accent-[var(--accent)]" formControlName="includeChat" /> Attach this chat transcript</label>
                <button type="submit" class="btn btn-primary" [disabled]="sending()">Create ticket</button>
              </form>
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    .launcher {
      background: var(--surface);
      color: var(--ink);
      border: 1px solid var(--line);
      transition: transform 0.5s var(--ease-spring-bouncy);
      animation: float 5s ease-in-out infinite;
    }
    .launcher:hover {
      transform: translateY(-3px) scale(1.03);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 99px;
      background: var(--gilt);
      animation: bounce 1s infinite;
    }
  `,
})
export class AskKabir {
  protected readonly chat = inject(SupportChatService);
  protected readonly auth = inject(AuthService);
  private readonly tickets = inject(TicketService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly inputEl = viewChild<ElementRef<HTMLTextAreaElement>>('input');

  protected readonly suggestions = SUGGESTED_QUESTIONS.slice(0, 4);
  protected readonly max = LIMITS.supportMessageMax;
  protected readonly limits = LIMITS;
  protected readonly repo = PUBLIC_ENV.repoUrl;
  protected readonly draft = signal('');
  protected readonly sending = signal(false);
  protected readonly ticketDone = signal('');
  protected readonly name = computed(() => this.auth.user()?.displayName?.split(' ')[0] ?? '');

  protected readonly ticket = new FormGroup({
    subject: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(LIMITS.ticketSubjectMax)] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(10), Validators.maxLength(LIMITS.ticketMessageMax)] }),
    includeChat: new FormControl(true, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      this.chat.messages();
      queueMicrotask(() => {
        const el = this.scroller()?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
      });
    });
  }

  protected openPanel(): void {
    this.chat.open.set(true);
    this.chat.unread.set(false);
    setTimeout(() => this.inputEl()?.nativeElement.focus(), 50);
  }

  protected close(): void {
    this.chat.open.set(false);
  }

  protected render(m: ChatMessage): string {
    return renderMiniMarkdown(stripActionMarker(m.content));
  }

  protected send(q: string): void {
    void this.chat.ask(q, this.router.url.split(/[?#]/)[0]);
  }

  protected submit(e: Event): void {
    e.preventDefault();
    const q = this.draft().trim();
    if (!q) return;
    this.draft.set('');
    this.send(q);
  }

  protected enter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.submit(e);
  }

  protected actionLabel(id: SupportActionId): string {
    return SUPPORT_ACTIONS[id]?.label ?? id;
  }

  protected runAction(id: SupportActionId): void {
    const action = SUPPORT_ACTIONS[id];
    if (!action) return;
    if (action.kind === 'navigate') {
      void this.router.navigateByUrl(action.target);
      if (window.matchMedia('(max-width: 639px)').matches) this.close();
    } else if (action.kind === 'theme') {
      this.theme.set(action.target as 'light' | 'dark' | 'oled');
      this.toast.success('Theme updated');
    } else if (action.kind === 'ticket') {
      this.chat.view.set('ticket');
    }
  }

  protected async copy(m: ChatMessage): Promise<void> {
    try {
      await navigator.clipboard.writeText(stripActionMarker(m.content));
      this.toast.success('Answer copied');
    } catch {
      this.toast.error('Could not copy');
    }
  }

  protected rate(m: ChatMessage, v: 'up' | 'down'): void {
    this.chat.feedback(m.id, v);
    if (m.feedback !== v) this.toast.info(v === 'up' ? 'Glad that helped!' : 'Thanks for the feedback', v === 'down' ? 'Try "Talk to a human" if you still need help.' : undefined);
  }

  /** Internal links inside answers are routed in-app. */
  protected onContentClick(e: MouseEvent): void {
    const a = (e.target as HTMLElement).closest('a[data-internal]');
    if (!a) return;
    e.preventDefault();
    void this.router.navigateByUrl(a.getAttribute('href') ?? '/help');
  }

  protected async createTicket(): Promise<void> {
    this.ticket.markAllAsTouched();
    if (this.ticket.invalid) return;
    this.sending.set(true);
    try {
      const v = this.ticket.getRawValue();
      const id = await this.tickets.create({
        subject: v.subject,
        message: v.message,
        transcript: v.includeChat ? this.chat.transcript() : [],
        page: this.router.url.split(/[?#]/)[0] ?? '/',
      });
      this.ticketDone.set(id);
      this.ticket.reset({ subject: '', message: '', includeChat: true });
      this.toast.success('Ticket created', `Reference ${id}`);
    } catch {
      this.toast.error('Could not create the ticket', 'Please try again, or open a GitHub issue.');
    } finally {
      this.sending.set(false);
    }
  }
}
