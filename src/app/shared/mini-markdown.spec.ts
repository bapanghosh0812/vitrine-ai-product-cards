import { escapeHtml, renderMiniMarkdown, stripActionMarker } from './mini-markdown';

describe('mini-markdown (XSS-safe chat rendering)', () => {
  it('escapes raw HTML from the model', () => {
    const html = renderMiniMarkdown('<script>alert(1)</script><img src=x onerror=alert(2)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('never creates javascript: or data: links', () => {
    const html = renderMiniMarkdown('[click](javascript:alert(1)) [x](data:text/html,hi)');
    expect(html).not.toMatch(/href="(javascript|data):/i);
  });

  it('renders safe external links with noopener and internal links for the router', () => {
    const html = renderMiniMarkdown('See [Help](/help/exporting) or [Groq](https://groq.com/privacy-policy/).');
    expect(html).toContain('<a href="/help/exporting" data-internal="true">Help</a>');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('formats bold, italic, code and lists', () => {
    const html = renderMiniMarkdown('**Bold** and *soft* with `code`\n\n- one\n- two\n\n1. first\n2. second');
    expect(html).toContain('<strong>Bold</strong>');
    expect(html).toContain('<em>soft</em>');
    expect(html).toContain('<code>code</code>');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>');
  });

  it('does not let attribute injection break out of an href', () => {
    const html = renderMiniMarkdown('[a](https://x.com/"onmouseover="alert(1))');
    expect(html).not.toContain('onmouseover="alert');
  });

  it('strips complete and partially streamed action markers', () => {
    expect(stripActionMarker('Done! [[actions: open-studio, open-help]]')).toBe('Done!');
    expect(stripActionMarker('Almost there [[act')).toBe('Almost there');
    expect(stripActionMarker('Ends with [')).toBe('Ends with');
  });

  it('escapeHtml covers quotes and ampersands', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});
