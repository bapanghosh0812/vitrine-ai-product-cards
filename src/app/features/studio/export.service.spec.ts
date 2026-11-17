import { TestBed } from '@angular/core/testing';
import { escapeHtml, ExportService } from './export.service';

describe('ExportService', () => {
  const base = {
    copy: { title: 'Lamp "Aurora" <b>', description: "It's warm & bright.", keywords: ['lamp', '<script>x</script>'] },
    name: 'Aurora lamp',
    category: 'home',
    template: 'luxe',
    price: '3490',
    currency: 'INR',
  };

  it('escapes every value in the HTML snippet and adds no scripts', () => {
    const html = TestBed.inject(ExportService).toHtml(base);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>');
    expect(html).toContain('Lamp &quot;Aurora&quot; &lt;b&gt;');
    expect(html).toContain('It&#39;s warm &amp; bright.');
  });

  it('only embeds images that are base64 data URLs', () => {
    const svc = TestBed.inject(ExportService);
    expect(svc.toHtml({ ...base, image: 'javascript:alert(1)' })).not.toContain('javascript:');
    expect(svc.toHtml({ ...base, image: 'data:image/webp;base64,QUJD' })).toContain('src="data:image/webp;base64,QUJD"');
  });

  it('exports structured JSON', () => {
    const data = JSON.parse(TestBed.inject(ExportService).toJson(base));
    expect(data).toMatchObject({ name: 'Aurora lamp', template: 'luxe', price: { amount: 3490, currency: 'INR' } });
    expect(data.category.label).toBe('Home & Living');
    expect(data.keywords).toHaveLength(2);
  });

  it('escapeHtml handles all special characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });
});
