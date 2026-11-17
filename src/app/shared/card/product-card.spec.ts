import { TestBed } from '@angular/core/testing';
import { TEMPLATE_IDS } from '../../../../shared/constants';
import { ProductCard } from './product-card';

const COPY = {
  title: 'Banarasi Silk Saree, Zari Weave',
  description: 'Woven by master artisans in Varanasi, its pure zari border catches every light.',
  keywords: ['banarasi saree', 'silk saree', 'zari border', 'wedding wear'],
};

describe('ProductCard', () => {
  async function render(inputs: Record<string, unknown>) {
    const fixture = TestBed.createComponent(ProductCard);
    for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it.each(TEMPLATE_IDS)('renders title, description and keywords in the %s template', async (template) => {
    const el = await render({ copy: COPY, template, category: 'fashion' });
    expect(el.textContent).toContain(COPY.title);
    expect(el.textContent).toContain(template === 'instagram' ? '#banarasisaree' : COPY.keywords[0]);
    if (template !== 'instagram') expect(el.textContent).toContain('Woven by master artisans');
    expect(el.getAttribute('aria-label')).toContain(COPY.title);
  });

  it('renders AI text as plain text, never as HTML', async () => {
    const el = await render({
      copy: { ...COPY, title: '<img src=x onerror="alert(1)">Evil', keywords: ['<b>bold</b>', 'ok one', 'two', 'three'] },
      template: 'luxe',
      category: 'fashion',
    });
    expect(el.querySelector('img[onerror]')).toBeNull();
    expect(el.querySelector('b')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror="alert(1)">Evil');
  });

  it('formats the price with the currency', async () => {
    const el = await render({ copy: COPY, template: 'marketplace', category: 'fashion', price: '18900', currency: 'INR' });
    expect(el.textContent).toMatch(/₹\s?18,900/);
  });

  it('shows the 3D category icon when there is no image and the photo when there is one', async () => {
    let el = await render({ copy: COPY, template: 'minimal', category: 'fashion' });
    expect(el.querySelector('img.pc__emoji')?.getAttribute('src')).toBe('emoji/dress.webp');
    el = await render({ copy: COPY, template: 'minimal', category: 'fashion', image: 'data:image/webp;base64,AAAA' });
    expect(el.querySelector('img.pc__img')?.getAttribute('alt')).toBe(COPY.title);
  });

  it('hides the watermark when disabled', async () => {
    const el = await render({ copy: COPY, template: 'bold', category: 'fashion', watermark: false });
    expect(el.textContent).not.toContain('Made with Vitrine');
  });
});
