/**
 * Input/output hygiene helpers. These run on every user-provided string before it
 * reaches a prompt, and on every model output before it reaches the browser.
 */

// Control characters (except tab/newline), zero-width and bidi-override characters.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁠-⁤﻿]/g;

/** Normalise a single-line user string: strip control chars and angle brackets, collapse spaces. */
export function cleanText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(CONTROL, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Multi-line variant used for chat messages (keeps line breaks, max 2 in a row). */
export function cleanMultiline(value: string): string {
  return value
    .normalize('NFKC')
    .replace(CONTROL, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const MARKDOWN_RE = /[*_`#|~]+/g;

/** Make model output safe and tidy for a product card. Plain text only. */
export function tidyCopyText(value: string): string {
  return cleanText(value.replace(URL_RE, '').replace(EMAIL_RE, '').replace(MARKDOWN_RE, ''))
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();
}

export function tidyKeyword(value: string): string {
  return tidyCopyText(value)
    .replace(/^#/, '')
    .replace(/[.,;:!?]+$/g, '')
    .toLowerCase()
    .slice(0, 32)
    .trim();
}

/** Trim a string to `max` characters on a word boundary, adding an ellipsis only when needed. */
export function clampWords(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:–-]+$/, '')}…`;
}

export function uniqueKeywords(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const k = tidyKeyword(raw);
    if (k.length < 2 || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}
