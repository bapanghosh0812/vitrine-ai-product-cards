import { randomInt } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Human-friendly ticket id such as VT-7K2M9Q (no 0/O/1/I/L confusion). */
export function randomTicketId(): string {
  let id = '';
  for (let i = 0; i < 6; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return `VT-${id}`;
}
