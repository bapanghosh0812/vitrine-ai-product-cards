/**
 * Renders the 1200x630 Open Graph image (public/brand/og-image.png) from HTML with the
 * brand fonts and art, using Playwright's Chromium.  Run: npx tsx scripts/render-og.ts
 */
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const b64 = (path: string) => readFileSync(path).toString('base64');
const serif = b64('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2');
const serifItalic = b64('node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2');
const geist = b64('node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2');
const icon = b64('public/brand/vitrine-icon-384.webp');
const kabir = b64('public/brand/kabir-bust.webp');
const logo = b64('public/brand/logo-mark.svg');

const html = `<!doctype html><html><head><style>
@font-face{font-family:'Instrument Serif';src:url(data:font/woff2;base64,${serif}) format('woff2');font-style:normal}
@font-face{font-family:'Instrument Serif';src:url(data:font/woff2;base64,${serifItalic}) format('woff2');font-style:italic}
@font-face{font-family:'Geist';src:url(data:font/woff2;base64,${geist}) format('woff2');font-weight:100 900}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;overflow:hidden;font-family:Geist,sans-serif;color:#fbf7f0;
 background:radial-gradient(70% 90% at 15% 0%,#1a7a5d 0%,#0e4d3a 45%,#05231a 100%)}
.arch{position:absolute;right:120px;top:70px;width:380px;height:560px;border:4px solid rgba(214,182,114,.75);border-bottom:0;border-radius:190px 190px 0 0;
 background:linear-gradient(180deg,rgba(214,182,114,.12),transparent 60%)}
.plinth{position:absolute;right:90px;bottom:0;width:440px;height:26px;border-radius:13px 13px 0 0;background:linear-gradient(180deg,#f6e3ae,#c9a35b 55%,#8f6e33)}
.kabir{position:absolute;right:150px;bottom:20px;height:500px}
.icon{position:absolute;right:450px;top:120px;width:150px;height:150px;border-radius:34px;transform:rotate(-8deg);box-shadow:0 30px 60px rgba(0,0,0,.45)}
.copy{position:absolute;left:80px;top:64px;width:620px}
.brand{display:flex;align-items:center;gap:16px;font-family:'Instrument Serif';font-size:44px}
.brand img{width:58px;height:58px}
h1{margin-top:34px;font-family:'Instrument Serif';font-weight:400;font-size:100px;line-height:.95;letter-spacing:-1px}
h1 em{font-style:italic;background:linear-gradient(100deg,#d6b672,#fbefc8 45%,#c9a35b 80%);-webkit-background-clip:text;color:transparent;padding-right:8px}
p{margin-top:24px;font-size:25px;line-height:1.4;color:rgba(251,247,240,.82);max-width:560px}
.tags{margin-top:26px;display:flex;gap:12px}
.tags span{font-size:18px;padding:8px 16px;border-radius:999px;border:1px solid rgba(214,182,114,.55);color:#ecd9a8}
.by{margin-top:26px;font-size:18px;color:rgba(251,247,240,.65)}
.spark{position:absolute;right:110px;top:52px;font-size:46px;color:#f6e3ae}
</style></head><body>
<div class="arch"></div><div class="plinth"></div>
<img class="kabir" src="data:image/webp;base64,${kabir}">
<img class="icon" src="data:image/webp;base64,${icon}">
<span class="spark">✦</span>
<div class="copy">
  <div class="brand"><img src="data:image/svg+xml;base64,${logo}">Vitrine</div>
  <h1>Products,<br><em>beautifully</em> told.</h1>
  <p>AI-written product titles, descriptions and SEO keywords on luxury cards you can edit and export.</p>
  <div class="tags"><span>6 templates</span><span>Groq + Gemini</span><span>Free</span></div>
  <div class="by">Designed &amp; built by Bapan Ghosh</div>
</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/brand/og-image.png', type: 'png' });
await browser.close();
console.log('og image: public/brand/og-image.png');
