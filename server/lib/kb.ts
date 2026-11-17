import { HELP_ARTICLES, type HelpArticle } from '../../shared/content/help.generated';

/**
 * Tiny BM25 retriever over the in-repo Help Center. The support bot is grounded only in
 * the chunks returned here; there is no web access and no other data source.
 */

const STOP = new Set(
  'a an and are as at be but by can do does for from how i if in into is it its me my of on or our so that the their them then there these this to was we what when where which who why will with you your yours vitrine please hi hello hey thanks thank'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

function stem(word: string): string {
  if (word.length > 5 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s')) return word.slice(0, -1);
  return word;
}

interface Chunk {
  slug: string;
  title: string;
  heading: string;
  text: string;
  tokens: string[];
  boost: Set<string>;
  article: HelpArticle;
}

const CHUNKS: Chunk[] = HELP_ARTICLES.flatMap((article) =>
  article.sections.map((section) => ({
    slug: article.slug,
    title: article.title,
    heading: section.heading,
    text: section.text,
    tokens: tokenize(`${section.heading} ${section.text}`),
    boost: new Set(tokenize(`${article.title} ${article.keywords.join(' ')} ${section.heading}`)),
    article,
  })),
);

const AVG_LEN = CHUNKS.reduce((n, c) => n + c.tokens.length, 0) / Math.max(1, CHUNKS.length);
const DF = new Map<string, number>();
for (const chunk of CHUNKS) for (const t of new Set(chunk.tokens)) DF.set(t, (DF.get(t) ?? 0) + 1);

function idf(term: string): number {
  const df = DF.get(term) ?? 0;
  return Math.log(1 + (CHUNKS.length - df + 0.5) / (df + 0.5));
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

export function searchChunks(query: string, k = 4): ScoredChunk[] {
  const terms = [...new Set(tokenize(query))];
  if (!terms.length) return [];
  const k1 = 1.2;
  const b = 0.75;
  const scored = CHUNKS.map((chunk) => {
    let score = 0;
    for (const term of terms) {
      const tf = chunk.tokens.filter((t) => t === term).length;
      if (tf) score += idf(term) * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * chunk.tokens.length) / AVG_LEN)));
      if (chunk.boost.has(term)) score += idf(term) * 0.8;
    }
    return { chunk, score };
  });
  return scored
    .filter((s) => s.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function buildKbContext(results: ScoredChunk[], maxChars = 3_800): string {
  const fallback = HELP_ARTICLES.find((a) => a.slug === 'getting-started');
  const parts: string[] = [];
  let used = 0;
  const list = results.length
    ? results.map((r) => ({ title: r.chunk.title, heading: r.chunk.heading, text: r.chunk.text, slug: r.chunk.slug }))
    : fallback
      ? fallback.sections.slice(0, 3).map((s) => ({ title: fallback.title, heading: s.heading, text: s.text, slug: fallback.slug }))
      : [];
  for (const item of list) {
    const block = `### ${item.title} / ${item.heading}\n${item.text}\n(source: /help/${item.slug})`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  return parts.join('\n\n');
}

export function searchArticles(query: string, k = 3): { slug: string; title: string; snippet: string }[] {
  const seen = new Set<string>();
  const out: { slug: string; title: string; snippet: string }[] = [];
  for (const { chunk } of searchChunks(query, 12)) {
    if (seen.has(chunk.slug)) continue;
    seen.add(chunk.slug);
    out.push({ slug: chunk.slug, title: chunk.title, snippet: chunk.text.slice(0, 220).replace(/\s+\S*$/, '') + '…' });
    if (out.length >= k) break;
  }
  if (!out.length) {
    for (const a of HELP_ARTICLES.slice(0, k)) out.push({ slug: a.slug, title: a.title, snippet: a.summary });
  }
  return out;
}

export function actionsFor(results: ScoredChunk[]): string[] {
  const ids = new Set<string>();
  for (const r of results) for (const a of r.chunk.article.actions) ids.add(a);
  return [...ids];
}
