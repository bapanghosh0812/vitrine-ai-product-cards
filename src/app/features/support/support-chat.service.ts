import { computed, inject, Injectable, signal } from '@angular/core';
import { LIMITS, SUPPORT_ACTION_IDS, type SupportActionId } from '../../../../shared/constants';
import type { KbSource, SupportEvent } from '../../../../shared/types';
import { ApiError, ApiService } from '../../core/api.service';
import { uid } from '../../core/platform';
import { StorageService } from '../../core/storage.service';
import { stripActionMarker } from '../../shared/mini-markdown';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'streaming' | 'done' | 'error';
  sources?: KbSource[];
  actions?: SupportActionId[];
  fallback?: { slug: string; title: string; snippet: string }[];
  feedback?: 'up' | 'down';
  provider?: string;
}

const KEY = 'support.chat';
export const SUGGESTED_QUESTIONS = [
  'How do I export my card as a PNG?',
  'Can I use Vitrine without an account?',
  'How do I change the theme to dark?',
  'What does the Brand Kit do?',
  'Which AI models write my copy?',
  'How do I delete my account?',
];

@Injectable({ providedIn: 'root' })
export class SupportChatService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(StorageService);

  readonly open = signal(false);
  readonly view = signal<'chat' | 'ticket'>('chat');
  readonly messages = signal<ChatMessage[]>(this.storage.get<ChatMessage[]>(KEY, [], 'preference').filter((m) => m.status !== 'streaming'));
  readonly busy = signal(false);
  readonly unread = signal(false);
  readonly isEmpty = computed(() => this.messages().length === 0);
  private abort: AbortController | null = null;

  private persist(): void {
    this.storage.set(KEY, this.messages().slice(-30), 'preference');
  }

  private patch(id: string, fn: (m: ChatMessage) => ChatMessage): void {
    this.messages.update((list) => list.map((m) => (m.id === id ? fn(m) : m)));
  }

  async ask(question: string, page?: string): Promise<void> {
    const text = question.trim().slice(0, LIMITS.supportMessageMax);
    if (!text || this.busy()) return;
    const user: ChatMessage = { id: uid('m'), role: 'user', content: text, status: 'done' };
    const bot: ChatMessage = { id: uid('m'), role: 'assistant', content: '', status: 'streaming' };
    const history = [...this.messages(), user]
      .filter((m) => m.status === 'done' && m.content)
      .slice(-LIMITS.supportHistoryMax)
      .map((m) => ({ role: m.role, content: stripActionMarker(m.content).slice(0, m.role === 'user' ? LIMITS.supportMessageMax : 1200) }));
    this.messages.update((l) => [...l, user, bot]);
    this.busy.set(true);
    this.abort = new AbortController();
    try {
      await this.api.support({ messages: history, page }, (e) => this.onEvent(bot.id, e), this.abort.signal);
      this.patch(bot.id, (m) => ({ ...m, status: m.status === 'streaming' ? 'done' : m.status }));
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        this.patch(bot.id, (m) => ({ ...m, status: 'done', content: m.content || 'Stopped.' }));
      } else {
        const msg = error instanceof ApiError ? error.message : 'Kabir is unavailable right now.';
        this.patch(bot.id, (m) => ({ ...m, status: 'error', content: msg }));
      }
    } finally {
      this.busy.set(false);
      this.abort = null;
      if (!this.open()) this.unread.set(true);
      this.persist();
    }
  }

  private onEvent(id: string, e: SupportEvent): void {
    switch (e.t) {
      case 'meta':
        this.patch(id, (m) => ({ ...m, sources: e.sources, provider: e.provider }));
        break;
      case 'delta':
        this.patch(id, (m) => ({ ...m, content: m.content + e.v }));
        break;
      case 'replace':
        this.patch(id, (m) => ({ ...m, content: e.v, sources: [] }));
        break;
      case 'fallback':
        this.patch(id, (m) => ({
          ...m,
          content:
            e.reason === 'unconfigured'
              ? "I can't reach my AI brain on this deployment, but these Help Center articles should answer your question:"
              : 'My AI brain is busy right now, so here are the closest Help Center articles:',
          fallback: e.articles,
        }));
        break;
      case 'done':
        this.patch(id, (m) => ({
          ...m,
          status: 'done',
          actions: e.actions.filter((a): a is SupportActionId => (SUPPORT_ACTION_IDS as string[]).includes(a)),
        }));
        break;
      case 'error':
        this.patch(id, (m) => ({ ...m, status: 'error', content: e.message }));
        break;
    }
  }

  stop(): void {
    this.abort?.abort();
  }

  feedback(id: string, value: 'up' | 'down'): void {
    this.patch(id, (m) => ({ ...m, feedback: m.feedback === value ? undefined : value }));
    this.persist();
  }

  reset(): void {
    this.stop();
    this.messages.set([]);
    this.view.set('chat');
    this.persist();
  }

  transcript(): { role: 'user' | 'assistant'; content: string }[] {
    return this.messages()
      .filter((m) => m.status === 'done')
      .slice(-8)
      .map((m) => ({ role: m.role, content: stripActionMarker(m.content).slice(0, 600) }));
  }
}
