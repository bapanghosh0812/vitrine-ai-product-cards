import { inject, Injectable } from '@angular/core';
import type { ApiErrorBody, GenerateRequest, GenerateResponse, SupportEvent, SupportRequest } from '../../../shared/types';
import { PUBLIC_ENV } from '../../environments/public-env';
import { AuthService } from './auth.service';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

const OFFLINE = new ApiError(0, 'offline', 'You appear to be offline. Check your connection and try again.');

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly auth = inject(AuthService);
  readonly base = PUBLIC_ENV.apiBase;

  private async headers(): Promise<Record<string, string>> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = await this.auth.getIdToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }

  private async toError(res: Response): Promise<ApiError> {
    try {
      const body = (await res.json()) as ApiErrorBody;
      return new ApiError(res.status, body.error?.code ?? 'error', body.error?.message ?? 'Request failed.', body.error?.retryAfter);
    } catch {
      return new ApiError(res.status, 'error', res.status >= 500 ? 'The server is having a moment. Please try again.' : 'Request failed.');
    }
  }

  async generate(body: GenerateRequest, signal?: AbortSignal): Promise<GenerateResponse> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/api/generate`, { method: 'POST', headers: await this.headers(), body: JSON.stringify(body), signal });
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      throw OFFLINE;
    }
    if (!res.ok) throw await this.toError(res);
    return (await res.json()) as GenerateResponse;
  }

  /** Streams NDJSON events from the support bot. */
  async support(body: SupportRequest, onEvent: (e: SupportEvent) => void, signal?: AbortSignal): Promise<void> {
    let res: Response;
    try {
      res = await fetch(`${this.base}/api/support`, { method: 'POST', headers: await this.headers(), body: JSON.stringify(body), signal });
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      throw OFFLINE;
    }
    if (!res.ok || !res.body) throw await this.toError(res);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          onEvent(JSON.parse(line) as SupportEvent);
        } catch {
          /* ignore malformed line */
        }
      }
    }
    if (buffer.trim()) {
      try {
        onEvent(JSON.parse(buffer) as SupportEvent);
      } catch {
        /* ignore */
      }
    }
  }

  async health(): Promise<{ status: string; ai: string; auth: string } | null> {
    try {
      const res = await fetch(`${this.base}/api/health`);
      return res.ok ? ((await res.json()) as { status: string; ai: string; auth: string }) : null;
    } catch {
      return null;
    }
  }
}
