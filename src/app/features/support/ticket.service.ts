import { inject, Injectable } from '@angular/core';
import { LIMITS } from '../../../../shared/constants';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { FirebaseService } from '../../core/firebase.service';

export interface TicketInput {
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  transcript: { role: 'user' | 'assistant'; content: string }[];
  page: string;
  /** Honeypot value from the hidden field (always empty for humans). */
  website?: string;
}

export interface Ticket {
  id: string;
  uid: string;
  email: string;
  name: string;
  phone?: string;
  subject: string;
  message: string;
  transcript: { role: 'user' | 'assistant'; content: string }[];
  page: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
}

export interface TicketResult {
  ticketId: string;
  emailed: boolean;
  confirmation: boolean;
}

/**
 * Tickets go to the API, which emails the support inbox and sends the requester a
 * confirmation. Signed-in users also get a copy in Firestore `tickets/{id}` (owner and
 * admins can read it), so it shows on their profile.
 */
@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);

  async create(input: TicketInput): Promise<TicketResult> {
    const user = this.auth.user();
    const body = {
      name: input.name.trim().slice(0, LIMITS.ticketNameMax),
      ...(user ? {} : { email: (input.email ?? '').trim() }),
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      subject: input.subject.trim().slice(0, LIMITS.ticketSubjectMax),
      message: input.message.trim().slice(0, LIMITS.ticketMessageMax),
      transcript: input.transcript.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 600) })),
      page: input.page.slice(0, 80),
      website: input.website ?? '',
    };
    const result = await this.api.createTicket(body);
    if (user) {
      try {
        const { db, fsMod } = await this.firebase.load();
        const ticket: Omit<Ticket, 'id'> = {
          uid: user.uid,
          email: (user.email ?? '').slice(0, 120),
          name: body.name,
          ...(body.phone ? { phone: body.phone } : {}),
          subject: body.subject,
          message: body.message,
          transcript: body.transcript,
          page: body.page,
          status: 'open',
          createdAt: Date.now(),
        };
        await fsMod.setDoc(fsMod.doc(db, 'tickets', result.ticketId), ticket);
      } catch {
        /* the email already reached the team; the profile copy is best effort */
      }
    }
    return result;
  }

  async listAll(): Promise<Ticket[]> {
    const { db, fsMod } = await this.firebase.load();
    const snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, 'tickets'), fsMod.orderBy('createdAt', 'desc'), fsMod.limit(200)));
    return snap.docs.map((d) => ({ ...(d.data() as Omit<Ticket, 'id'>), id: d.id }));
  }

  async listMine(): Promise<Ticket[]> {
    const uid = this.auth.user()?.uid;
    if (!uid) return [];
    const { db, fsMod } = await this.firebase.load();
    const snap = await fsMod.getDocs(fsMod.query(fsMod.collection(db, 'tickets'), fsMod.where('uid', '==', uid), fsMod.orderBy('createdAt', 'desc'), fsMod.limit(50)));
    return snap.docs.map((d) => ({ ...(d.data() as Omit<Ticket, 'id'>), id: d.id }));
  }

  async setStatus(id: string, status: Ticket['status']): Promise<void> {
    const { db, fsMod } = await this.firebase.load();
    await fsMod.updateDoc(fsMod.doc(db, 'tickets', id), { status });
  }
}
