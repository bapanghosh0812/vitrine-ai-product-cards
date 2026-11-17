/**
 * Minimal, escape-first Markdown renderer for chat messages (AI output).
 * 1. Every character is HTML-escaped first, so no markup from the model survives.
 * 2. Only a tiny whitelist of formatting is then re-introduced: paragraphs, line breaks,
 *    lists, **bold**, *italic*, `code` and [links](https://… or /path).
 * The result is additionally passed through Angular's DOM sanitizer by [innerHTML].
 */
const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

/** Removes the bot's action marker, including a partially streamed one at the end. */
export function stripActionMarker(text: string): string {
  let out = text.replace(/\[\[\s*actions?\s*:[^\]]*\]\]/gi, '');
  const open = out.lastIndexOf('[[');
  if (open >= 0 && !out.slice(open).includes(']]')) out = out.slice(0, open);
  return out.replace(/\[$/, '').trimEnd();
}

function inline(s: string): string {
  let out = s;
  // code spans first, protect their content
  const codes: string[] = [];
  out = out.replace(/`([^`\n]{1,200})`/g, (_m, c: string) => {
    codes.push(`<code>${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  // links: [text](url) — url already escaped; allow https?:// or a same-site path
  out = out.replace(/\[([^\]\n]{1,120})\]\(((?:https?:\/\/|\/)[^\s)]{0,300})\)/g, (_m, text: string, url: string) => {
    const external = /^https?:/.test(url);
    const safeUrl = url.replace(/&amp;/g, '&');
    if (!/^(https?:\/\/[\w.-]+(?:\/[\w\-./?=&%#]*)?|\/[\w\-./?=&%#]*)$/.test(safeUrl)) return text;
    return external
      ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`
      : `<a href="${escapeHtml(safeUrl)}" data-internal="true">${text}</a>`;
  });
  out = out.replace(/\*\*([^*\n]{1,300})\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[\s(])\*([^*\n]{1,200})\*(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
  out = out.replace(/(^|[\s(])_([^_\n]{1,200})_(?=[\s).,!?:;]|$)/g, '$1<em>$2</em>');
  // eslint-disable-next-line no-control-regex
  out = out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codes[Number(i)] ?? '');
  return out;
}

export function renderMiniMarkdown(source: string): string {
  const text = escapeHtml(source.replace(/\r\n?/g, '\n').trim());
  if (!text) return '';
  const blocks = text.split(/\n{2,}/);
  const html: string[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      html.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>`).join('')}</ul>`);
    } else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      html.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`);
    } else {
      const parts: string[] = [];
      let list: string[] = [];
      let ordered = false;
      const flush = () => {
        if (list.length) parts.push(`<${ordered ? 'ol' : 'ul'}>${list.join('')}</${ordered ? 'ol' : 'ul'}>`);
        list = [];
      };
      const para: string[] = [];
      const flushPara = () => {
        if (para.length) parts.push(`<p>${para.map(inline).join('<br>')}</p>`);
        para.length = 0;
      };
      for (const l of lines) {
        const ul = /^\s*[-*•]\s+(.*)$/.exec(l);
        const ol = /^\s*\d+[.)]\s+(.*)$/.exec(l);
        if (ul || ol) {
          flushPara();
          if (list.length && ordered !== !!ol) flush();
          ordered = !!ol;
          list.push(`<li>${inline((ul ?? ol)![1] ?? '')}</li>`);
        } else {
          flush();
          para.push(l.replace(/^#{1,6}\s+/, ''));
        }
      }
      flush();
      flushPara();
      html.push(parts.join(''));
    }
  }
  return html.join('');
}
