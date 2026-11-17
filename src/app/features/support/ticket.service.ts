import { inject, Injectable } from '@angular/core';
import { LIMITS } from '../../../../shared/constants';
import { AuthService } from '../../core/auth.service';
import { FirebaseService } from '../../core/firebase.service';
import { ticketId } from '../../core/platform';

export interface TicketInput {
  subject: string;
  message: string;
  transcript: { role: 'user' | 'assistant'; content: string }[];
  page: string;
}

export interface Ticket extends TicketInput {
  id: string;
  uid: string;
  email: string;
  name: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: number;
}

/** Support tickets live in Firestore `tickets/{id}`. Owners create/read their own; admins read all. */
@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly auth = inject(AuthService);
  private readonly firebase = inject(FirebaseService);

  async create(input: TicketInput): Promise<string> {
    const user = this.auth.user();
    if (!user) throw new Error('signin-required');
    const { db, fsMod } = await this.firebase.load();
    const id = ticketId();
    const ticket: Omit<Ticket, 'id'> = {
      uid: user.uid,
      email: (user.email ?? '').slice(0, 120),
      name: (user.displayName ?? '').slice(0, 60),
      subject: input.subject.trim().slice(0, LIMITS.ticketSubjectMax),
      message: input.message.trim().slice(0, LIMITS.ticketMessageMax),
      transcript: input.transcript.slice(-8).map((m) => ({ role: m.role, content: m.content.slice(0, 600) })),
      page: input.page.slice(0, 80),
      status: 'open',
      createdAt: Date.now(),
    };
    await fsMod.setDoc(fsMod.doc(db, 'tickets', id), ticket);
    return id;
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
