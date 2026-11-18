import { describe, expect, it } from 'vitest';
import { cleanStyle, styleClasses, styleColours } from './card-style';

describe('card style helpers', () => {
  it('keeps valid options and drops unknown or tampered values', () => {
    const style = cleanStyle({
      palette: 'noir',
      base: 'red;background:url(https://evil.example)',
      accent: '#e5c07b',
      font: 'comic',
      titleCase: 'upper',
      badge: '  <b>Best</b>seller\u0007 ',
      lines: 40,
      keywords: -3,
      hidePrice: 'yes',
      script: 'alert(1)',
    });
    expect(style).toEqual({ palette: 'noir', accent: '#e5c07b', titleCase: 'upper', badge: 'bBest/bseller', lines: 6, keywords: 0 });
  });

  it('caps badge text at 24 characters', () => {
    expect(cleanStyle({ badge: 'x'.repeat(40) }).badge).toHaveLength(24);
    expect(cleanStyle(null)).toEqual({});
  });

  it('resolves palette colours, including custom ones', () => {
    expect(styleColours({ palette: 'sapphire' })).toEqual({ base: '#14213d', accent: '#e5c07b' });
    expect(styleColours({ palette: 'custom', base: '#111111', accent: '#eeeeee' })).toEqual({ base: '#111111', accent: '#eeeeee' });
    expect(styleColours({ palette: 'custom', base: '#111111' })).toBeNull();
    expect(styleColours({})).toBeNull();
  });

  it('maps options to host classes', () => {
    expect(styleClasses({ font: 'serif', radius: 'round', frame: true, hideKeywords: true })).toBe(' pc--font-serif pc--radius-round pc--frame pc--hide-tags');
    expect(styleClasses({ keywords: 0 })).toBe(' pc--hide-tags');
    expect(styleClasses(null)).toBe('');
  });
});
