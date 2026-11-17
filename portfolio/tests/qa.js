#!/usr/bin/env node
/*
 * Chagas Portfolio — automated QA harness (Playwright / Chromium)
 *
 * Usage:  node portfolio/tests/qa.js [port]        (default port 8091)
 * Env:    QA_PATH=/portfolio/  (page path)   QA_HEADED=1 not supported (launch() w/o options)
 * Output: console summary + portfolio/tests/qa-report.json + screenshots/*.png
 * Exit:   0 = no FAIL, 1 = at least one FAIL, 2 = harness crash
 *
 * ---------------------------------------------------------------------------
 * DATA-ATTRIBUTE / MARKUP CONTRACT (developers: please match these)
 * Selectors fall back to role/text heuristics, but these are the reliable hooks.
 *
 *   Sections         section#trabalhos, #servicos, #investimento, #sobre, #contato
 *   Nav toggle       button[data-nav-toggle][aria-controls="<menu id>"][aria-expanded]
 *   Nav menu         [data-nav-menu] (element referenced by aria-controls)
 *   Project item     [data-project]  (one per item in content/portfolio.json)
 *   Lightbox trigger [data-lightbox] (button/link inside or equal to [data-project])
 *   Lightbox dialog  [data-lightbox-dialog] role="dialog" aria-modal="true"
 *                    (or native <dialog>); Esc closes; ArrowLeft/Right navigate;
 *                    focus moves inside and returns to trigger on close.
 *   Lightbox ctrls   [data-lightbox-close], [data-lightbox-prev], [data-lightbox-next]
 *   Pricing service  [data-pricing-service]  (7, from content/pricing.json)
 *   Pricing tier     [data-pricing-tier]     (3 per service)
 *   Contact form     form#contact-form  with inputs name="name", name="email",
 *                    textarea name="message"; each has <label for>; invalid
 *                    fields get aria-invalid="true" + aria-describedby -> error text.
 *                    Form must NOT submit when empty (use novalidate + JS, or native).
 *   Reveal anim      [data-reveal]  (must end opacity:1 under prefers-reduced-motion)
 * ---------------------------------------------------------------------------
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = parseInt(process.argv[2] || process.env.QA_PORT || '8091', 10);
const ROOT = path.resolve(__dirname, '..', '..'); // repo root
const PAGE_PATH = process.env.QA_PATH || '/portfolio/';
const BASE = `http://127.0.0.1:${PORT}`;
const URL_ = BASE + PAGE_PATH;
const SHOTS = path.join(__dirname, 'screenshots');
const REPORT = path.join(__dirname, 'qa-report.json');
const VIEWPORTS = [360, 390, 768, 1024, 1440, 1920];
const JS_BUDGET = 60 * 1024;
const EXPECTED_SERVICES = 7;
const EXPECTED_TIERS = 3;

const results = [];
function rec(id, status, detail) {
  results.push({ id, status, detail: detail == null ? '' : String(detail) });
}
async function check(id, fn) {
  try { await fn(); } catch (e) { rec(id, 'FAIL', 'exception: ' + (e && e.message ? e.message.split('\n')[0] : e)); }
}

// ---------- static server ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
  '.mjs': 'application/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain', '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.webm': 'video/webm' };
function startServer() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    let f = path.normalize(path.join(ROOT, p));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.stat(f, (err, st) => {
      if (!err && st.isDirectory()) {
        if (!p.endsWith('/')) { res.writeHead(301, { Location: p + '/' }); return res.end(); }
        f = path.join(f, 'index.html');
      }
      fs.readFile(f, (e2, buf) => {
        if (e2) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        res.end(buf);
      });
    });
  });
  return new Promise((ok, ko) => { srv.once('error', ko); srv.listen(PORT, '127.0.0.1', () => ok(srv)); });
}

// ---------- helpers ----------
async function fetchStatus(url) {
  return new Promise((ok) => {
    http.get(url, (r) => { r.resume(); ok(r.statusCode); }).on('error', () => ok(0));
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gotoPage(page) {
  const resp = await page.goto(URL_, { waitUntil: 'load', timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  return resp;
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    // ===== Desktop pass: console, network, DOM-level checks =====
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const consoleErrors = [], failed = [], jsBytes = { total: 0, files: [] };
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => failed.push(`${r.failure() && r.failure().errorText} ${r.url()}`));
    page.on('response', async (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
      if (r.status() < 400 && r.request().resourceType() === 'script' && r.url().startsWith(BASE)) {
        try { const b = await r.body(); jsBytes.total += b.length; jsBytes.files.push(`${r.url().replace(BASE, '')} ${b.length}B`); } catch (_) {}
      }
    });

    let resp;
    await check('page.loads', async () => {
      resp = await gotoPage(page);
      const s = resp ? resp.status() : 0;
      rec('page.loads', s === 200 ? 'PASS' : 'FAIL', `HTTP ${s} ${URL_}`);
    });
    if (!resp || resp.status() !== 200) {
      rec('abort', 'FAIL', 'Page not reachable; remaining checks skipped');
      return;
    }
    await sleep(800);

    await check('console.errors', async () => {
      rec('console.errors', consoleErrors.length ? 'FAIL' : 'PASS', consoleErrors.length ? consoleErrors.slice(0, 8).join(' | ') : '0 errors');
    });
    await check('network.failed', async () => {
      const uniq = [...new Set(failed)];
      rec('network.failed', uniq.length ? 'FAIL' : 'PASS', uniq.length ? uniq.slice(0, 10).join(' | ') : '0 failed requests');
    });
    await check('perf.js-budget', async () => {
      rec('perf.js-budget', jsBytes.total <= JS_BUDGET ? 'PASS' : 'FAIL', `${(jsBytes.total / 1024).toFixed(1)}KB / 60KB (${jsBytes.files.join(', ') || 'no scripts'})`);
    });

    // --- internal links & sources ---
    await check('links.internal', async () => {
      const refs = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('[href],[src],[srcset],[poster]').forEach((el) => {
          ['href', 'src', 'poster'].forEach((a) => { const v = el.getAttribute(a); if (v) out.push({ a, v, abs: new URL(v, location.href).href, tag: el.tagName }); });
          const ss = el.getAttribute('srcset');
          if (ss) ss.split(',').forEach((c) => { const u = c.trim().split(/\s+/)[0]; if (u) out.push({ a: 'srcset', v: u, abs: new URL(u, location.href).href, tag: el.tagName }); });
        });
        return out;
      });
      const bad = [];
      const seen = new Set();
      for (const r of refs) {
        if (/^(mailto:|tel:|javascript:|data:|blob:)/i.test(r.v)) continue;
        const u = new URL(r.abs);
        if (u.origin !== new URL(BASE).origin) continue;
        if (r.v.startsWith('#')) {
          const id = decodeURIComponent(r.v.slice(1));
          if (id && !(await page.$(`[id="${id.replace(/"/g, '\\"')}"]`))) bad.push(`anchor ${r.v}`);
          continue;
        }
        const key = u.origin + u.pathname;
        if (seen.has(key)) continue; seen.add(key);
        const st = await fetchStatus(key);
        if (st >= 400 || st === 0) bad.push(`${st} ${r.tag}[${r.a}]=${r.v}`);
        if (u.hash && u.pathname === new URL(URL_).pathname) {
          if (!(await page.$(`[id="${decodeURIComponent(u.hash.slice(1))}"]`))) bad.push(`anchor ${r.v}`);
        }
      }
      rec('links.internal', bad.length ? 'FAIL' : 'PASS', bad.length ? bad.slice(0, 12).join(' | ') : `${refs.length} refs ok`);
    });
    await check('links.external-rel', async () => {
      const bad = await page.$$eval('a[target="_blank"]', (as) => as.filter((a) => !/noopener|noreferrer/.test(a.rel)).map((a) => a.href));
      rec('links.external-rel', bad.length ? 'WARN' : 'PASS', bad.length ? 'missing rel=noopener: ' + bad.join(', ') : 'ok');
    });

    // --- sections & nav anchors (v3) ---
    await check('sections.present', async () => {
      const missing = [];
      for (const id of SECTIONS) if (!(await page.$('#' + id))) missing.push('#' + id);
      rec('sections.present', missing.length ? 'FAIL' : 'PASS', missing.length ? 'missing ' + missing.join(', ') : SECTIONS.length + ' sections');
    });
    await check('nav.anchors', async () => {
      const hrefs = await page.$$eval('[data-nav-menu] a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')));
      const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id));
      const unresolved = hrefs.filter((h) => !ids.includes(decodeURIComponent(h.slice(1))));
      const notCovered = SECTIONS.filter((s) => !hrefs.includes('#' + s));
      const ok = hrefs.length === SECTIONS.length && !unresolved.length && !notCovered.length;
      rec('nav.anchors', ok ? 'PASS' : 'FAIL', `${hrefs.length}/${SECTIONS.length} anchors in [data-nav-menu]` +
        (unresolved.length ? `; unresolved ${unresolved.join(',')}` : '') + (notCovered.length ? `; sections w/o nav link ${notCovered.join(',')}` : ''));
    });

    // --- headings / SEO ---
    await check('seo.h1', async () => {
      const n = await page.$$eval('h1', (h) => h.filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').length);
      const all = await page.$$eval('h1', (h) => h.length);
      rec('seo.h1', all === 1 ? 'PASS' : 'FAIL', `${all} h1 in DOM (${n} visible)`);
    });
    await check('a11y.heading-order', async () => {
      const lv = await page.$$eval('h1,h2,h3,h4,h5,h6', (hs) => hs.map((h) => +h.tagName[1]));
      const jumps = []; for (let i = 1; i < lv.length; i++) if (lv[i] - lv[i - 1] > 1) jumps.push(`h${lv[i - 1]}->h${lv[i]}`);
      rec('a11y.heading-order', jumps.length ? 'WARN' : 'PASS', jumps.length ? jumps.join(', ') : `${lv.length} headings`);
    });
    await check('seo.meta', async () => {
      const m = await page.evaluate(() => {
        const q = (s) => { const e = document.querySelector(s); return e ? (e.getAttribute('content') || e.getAttribute('href') || '') : null; };
        let ld = [], ldErr = null;
        document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { try { ld.push(JSON.parse(s.textContent)); } catch (e) { ldErr = e.message; } });
        return {
          lang: document.documentElement.lang, title: document.title, desc: q('meta[name="description"]'),
          viewport: q('meta[name="viewport"]'), canonical: q('link[rel="canonical"]'),
          ogTitle: q('meta[property="og:title"]'), ogDesc: q('meta[property="og:description"]'),
          ogImage: q('meta[property="og:image"]'), ogUrl: q('meta[property="og:url"]'), ogType: q('meta[property="og:type"]'),
          twitter: q('meta[name="twitter:card"]'), ld: ld.length, ldErr, charset: !!document.querySelector('meta[charset]'),
        };
      });
      const fail = [], warn = [];
      if (!m.title) fail.push('title'); else if (m.title.length < 30 || m.title.length > 60) warn.push(`title len ${m.title.length}`);
      if (!m.desc) fail.push('description'); else if (m.desc.length < 70 || m.desc.length > 160) warn.push(`desc len ${m.desc.length}`);
      if (!m.viewport) fail.push('viewport');
      if (!m.lang) fail.push('html[lang]');
      if (!m.charset) warn.push('meta charset');
      if (!m.canonical) fail.push('canonical');
      ['ogTitle', 'ogDesc', 'ogImage', 'ogUrl', 'ogType'].forEach((k) => { if (!m[k]) fail.push(k); });
      if (!m.twitter) warn.push('twitter:card');
      if (m.ldErr) fail.push('JSON-LD parse: ' + m.ldErr); else if (!m.ld) fail.push('JSON-LD');
      rec('seo.meta', fail.length ? 'FAIL' : warn.length ? 'WARN' : 'PASS',
        (fail.length ? 'missing/bad: ' + fail.join(', ') : '') + (warn.length ? ' warn: ' + warn.join(', ') : '') || `title="${m.title}"`);
    });
    await check('a11y.landmarks', async () => {
      const miss = [];
      for (const s of ['header', 'nav', 'main', 'footer']) if (!(await page.$(`${s}, [role="${s === 'header' ? 'banner' : s === 'footer' ? 'contentinfo' : s === 'nav' ? 'navigation' : 'main'}"]`))) miss.push(s);
      const skip = await page.$('a[href="#main"], a[href="#conteudo"], a.skip-link, a[class*="skip"]');
      rec('a11y.landmarks', miss.length ? 'FAIL' : skip ? 'PASS' : 'WARN', miss.length ? 'missing ' + miss.join(', ') : skip ? 'ok + skip link' : 'no skip link');
    });

    // --- images ---
    await check('img.alt-dimensions', async () => {
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
      await sleep(400);
      const imgs = await page.$$eval('img', (is) => is.map((i) => ({
        src: i.getAttribute('src') || i.currentSrc, alt: i.hasAttribute('alt'), w: i.hasAttribute('width'), h: i.hasAttribute('height'),
        ar: getComputedStyle(i).aspectRatio !== 'auto', lazy: i.getAttribute('loading'), top: i.getBoundingClientRect().top + scrollY,
        broken: i.complete && i.naturalWidth === 0,
      })));
      const noAlt = imgs.filter((i) => !i.alt).map((i) => i.src);
      const noDim = imgs.filter((i) => !(i.w && i.h) && !i.ar).map((i) => i.src);
      const broken = imgs.filter((i) => i.broken).map((i) => i.src);
      const notLazy = imgs.filter((i) => i.top > 1200 && i.lazy !== 'lazy').map((i) => i.src);
      if (!imgs.length) return rec('img.alt-dimensions', 'WARN', 'no <img> found');
      rec('img.alt-dimensions', noAlt.length || noDim.length || broken.length ? 'FAIL' : 'PASS',
        `${imgs.length} imgs; noAlt=${noAlt.length} noDims=${noDim.length} broken=${broken.length} ` + [...noAlt, ...noDim, ...broken].slice(0, 5).join(', '));
      rec('img.lazy', notLazy.length ? 'WARN' : 'PASS', notLazy.length ? `below-fold w/o loading=lazy: ${notLazy.slice(0, 5).join(', ')}` : 'ok');
    });

    // --- accessible names & labels (axe-lite) ---
    await check('a11y.names', async () => {
      const bad = await page.evaluate(() => {
        const name = (el) => {
          if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim();
          const lb = el.getAttribute('aria-labelledby');
          if (lb) return lb.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ').trim();
          let t = (el.textContent || '').trim();
          if (!t) el.querySelectorAll('img[alt],svg title').forEach((i) => { t += (i.getAttribute('alt') || i.textContent || '').trim(); });
          return t || (el.getAttribute('title') || '').trim() || (el.value || '').trim();
        };
        const out = [];
        document.querySelectorAll('a[href], button, [role="button"], input[type="submit"], input[type="button"]').forEach((el) => {
          if (!name(el)) out.push(el.outerHTML.slice(0, 90));
        });
        return out;
      });
      rec('a11y.names', bad.length ? 'FAIL' : 'PASS', bad.length ? `${bad.length} unnamed: ` + bad.slice(0, 4).join(' | ') : 'all buttons/links named');
    });
    await check('a11y.form-labels', async () => {
      const bad = await page.evaluate(() => [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea')]
        .filter((el) => !(el.labels && el.labels.length) && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby'))
        .map((el) => el.name || el.id || el.outerHTML.slice(0, 60)));
      rec('a11y.form-labels', bad.length ? 'FAIL' : 'PASS', bad.length ? 'unlabeled: ' + bad.join(', ') : 'ok');
    });
    await check('a11y.contrast', async () => {
      const bad = await page.evaluate(() => {
        const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 1]; };
        const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage !== 'none') return null; const c = parse(s.backgroundColor); if ((c[3] ?? 1) > 0.9) return c; } return [255, 255, 255, 1]; };
        const out = [];
        document.querySelectorAll('p, li, a, button, label, h1, h2, h3, h4, span, small, td, th').forEach((el) => {
          if (!el.offsetParent || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
          const s = getComputedStyle(el); if (parseFloat(s.opacity) < 0.5) return;
          const bg = bgOf(el); if (!bg) return; const fg = parse(s.color); if ((fg[3] ?? 1) < 0.9) return;
          const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
          const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
          if (ratio < (large ? 3 : 4.5)) out.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 25)}" ${ratio.toFixed(2)}`);
        });
        return out;
      });
      rec('a11y.contrast', bad.length ? 'WARN' : 'PASS', bad.length ? `${bad.length} low-contrast (heuristic): ` + bad.slice(0, 5).join(' | ') : 'ok (solid backgrounds only)');
    });

    // --- content: real works (Portfólio) ---
    await check('content.projects', async () => {
      const expected = Array.isArray(DATA.portfolio && DATA.portfolio.projects) ? DATA.portfolio.projects.length : null;
      const n = await page.$$eval('[data-project]', (e) => e.length);
      const st = !n ? 'FAIL' : expected != null && n !== expected ? 'WARN' : 'PASS';
      rec('content.projects', st, `${n} [data-project] rendered${expected != null ? `, ${expected} in portfolio.json` : ', portfolio.json unreadable'}`);
    });

    // --- pricing (content/pricing.json is the only price source) ---
    await check('content.pricing', async () => {
      const groups = (DATA.pricing && Array.isArray(DATA.pricing.groups)) ? DATA.pricing.groups : null;
      if (!groups) return rec('content.pricing', 'FAIL', 'content/pricing.json has no "groups" (v3 contract) — cannot compare');
      const dom = await page.$$eval('[data-pricing-group]', (gs) => gs.map((g) => [...g.querySelectorAll('[data-pricing-item]')].map((i) => i.innerText.replace(/\s+/g, ' '))));
      const expItems = groups.reduce((a, g) => a + g.items.length, 0);
      const gotItems = dom.reduce((a, g) => a + g.length, 0);
      const problems = [];
      if (dom.length !== groups.length) problems.push(`groups ${dom.length}/${groups.length}`);
      if (gotItems !== expItems) problems.push(`items ${gotItems}/${expItems}`);
      groups.forEach((g, gi) => g.items.forEach((it, ii) => {
        const txt = (dom[gi] || [])[ii];
        if (txt == null) return;
        if (it.price_from == null) { if (!/sob consulta/i.test(txt)) problems.push(`${it.id}: null price w/o "Sob consulta"`); return; }
        if (!brlRegex(it.price_from).test(txt)) problems.push(`${it.id}: expected ${brlFmt(it.price_from)} got "${txt.slice(0, 50)}"`);
      }));
      rec('content.pricing', problems.length ? 'FAIL' : 'PASS', problems.length ? problems.slice(0, 6).join(' | ') : `${dom.length} groups / ${gotItems} items, R$ pt-BR ok`);
    });
    await check('content.pricing-notes', async () => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
      const disc = norm((DATA.pricing && DATA.pricing.disclaimer) || 'Valores de referência iniciais');
      const note = norm((DATA.pricing && DATA.pricing.note) || 'Os valores podem variar');
      const t = await page.evaluate(() => ({
        d: (document.querySelector('[data-slot="pricing-disclaimer"]') || {}).innerText || '',
        n: (document.querySelector('[data-slot="pricing-note"]') || {}).innerText || '',
        all: ((document.getElementById('orcamento') || {}).innerText || ''),
      }));
      const hasD = norm(t.d).includes(disc.slice(0, 40)) || norm(t.all).includes(disc.slice(0, 40));
      const hasN = norm(t.n).includes(note.slice(0, 40)) || norm(t.all).includes(note.slice(0, 40));
      rec('content.pricing-notes', hasD && hasN ? 'PASS' : 'FAIL', `disclaimer:${hasD} note:${hasN} (slot pricing-disclaimer ${t.d.length}ch, pricing-note ${t.n.length}ch)`);
    });

    // --- selected projects + filters ---
    await check('content.selected', async () => {
      const exp = Array.isArray(DATA.portfolio && DATA.portfolio.selected) ? DATA.portfolio.selected : null;
      const items = await page.$$eval('[data-selected-project]', (es) => es.map((e) => e.getAttribute('data-type')));
      const badType = items.filter((t) => !SELECTED_TYPES.includes(t));
      const st = exp == null ? 'FAIL' : items.length === exp.length && items.length && !badType.length ? 'PASS' : 'FAIL';
      rec('content.selected', st, `${items.length} [data-selected-project]${exp ? `, ${exp.length} in portfolio.json selected` : ', portfolio.json has no "selected"'}` +
        (badType.length ? `; invalid data-type: ${[...new Set(badType)].join(',')}` : ''));
    });
    await check('content.selected-filters', async () => {
      const btns = await page.$$('[data-slot="selected-filters"] button, [data-slot="selected-filters"] [role="tab"], [data-slot="selected-filters"] input[type="radio"]');
      if (!btns.length) return rec('content.selected-filters', 'FAIL', 'no filter buttons in [data-slot=selected-filters]');
      const visible = () => page.$$eval('[data-selected-project]', (es) => es.filter((e) => { const s = getComputedStyle(e); return !e.hidden && !e.closest('[hidden]') && s.display !== 'none' && s.visibility !== 'hidden' && e.getBoundingClientRect().height > 0; }).map((e) => e.getAttribute('data-type')));
      const all = await visible();
      const log = []; let changed = false, mismatch = [];
      for (const b of btns) {
        const key = ((await b.getAttribute('data-filter')) || (await b.getAttribute('value')) || (await b.innerText()) || '').toLowerCase();
        const type = SELECTED_TYPES.find((t) => key.includes(t.slice(0, 7)));
        await b.scrollIntoViewIfNeeded().catch(() => {}); await b.click(); await sleep(450);
        const v = await visible();
        log.push(`${type || key.trim().slice(0, 12) || '?'}:${v.length}`);
        if (v.length !== all.length) changed = true;
        if (type && v.some((t) => t !== type)) mismatch.push(type);
        const pressed = (await b.getAttribute('aria-pressed')) || (await b.getAttribute('aria-selected')) || (await b.getAttribute('aria-checked'));
        if (pressed == null) mismatch.push(`${key.trim().slice(0, 12)} w/o aria-pressed/selected`);
      }
      await btns[0].click().catch(() => {}); await sleep(300);
      rec('content.selected-filters', changed && !mismatch.length ? 'PASS' : changed ? 'WARN' : 'FAIL',
        `all:${all.length} ${log.join(' ')}${mismatch.length ? ' | issues: ' + [...new Set(mismatch)].join(', ') : ''}`);
    });

    // --- digital products ---
    await check('content.products', async () => {
      const exp = Array.isArray(DATA.portfolio && DATA.portfolio.products) ? DATA.portfolio.products.length : null;
      const prods = await page.$$eval('[data-product]', (ps, WA) => ps.map((p) => ({
        id: p.getAttribute('data-product') || p.id || '',
        price: /R\$\s?\d|sob consulta/i.test(p.innerText),
        cta: [...p.querySelectorAll('a[href]')].some((a) => a.href.startsWith(WA)),
      })), WA_PREFIX);
      const bad = prods.filter((p) => !p.price || !p.cta).map((p) => `${p.id || '?'}(${p.price ? '' : 'no price '}${p.cta ? '' : 'no wa.me CTA'})`);
      const st = exp == null ? 'FAIL' : prods.length === exp && prods.length && !bad.length ? 'PASS' : 'FAIL';
      rec('content.products', st, `${prods.length} [data-product]${exp != null ? `, ${exp} in portfolio.json` : ', portfolio.json has no "products"'}${bad.length ? '; ' + bad.join(', ') : ''}`);
    });

    // --- contact links ---
    await check('contact.links', async () => {
      const r = await page.evaluate(({ IG, MAIL, WA }) => {
        const sec = document.getElementById('contato');
        const find = (root, pred) => !!(root && [...root.querySelectorAll('a[href]')].some((a) => pred(a.getAttribute('href') || '')));
        const preds = { instagram: (h) => h.replace(/\/?$/, '/') === IG, email: (h) => h.toLowerCase().startsWith(MAIL), whatsapp: (h) => h.startsWith(WA) };
        const out = {};
        for (const k of Object.keys(preds)) out[k] = find(sec, preds[k]) ? 'contato' : find(document, preds[k]) ? 'page' : 'missing';
        return out;
      }, { IG: IG_URL, MAIL: 'mailto:' + EMAIL, WA: WA_PREFIX });
      const miss = Object.entries(r).filter(([, v]) => v === 'missing').map(([k]) => k);
      const outside = Object.entries(r).filter(([, v]) => v === 'page').map(([k]) => k);
      rec('contact.links', miss.length ? 'FAIL' : outside.length ? 'WARN' : 'PASS', JSON.stringify(r));
    });

    // --- WhatsApp float (desktop presence; mobile overlap checked in responsive pass) ---
    await check('whatsapp.float', async () => {
      const f = await page.evaluate((WA) => {
        const a = document.querySelector('a[data-whatsapp-float]');
        if (!a) return null;
        const name = (a.getAttribute('aria-label') || a.textContent || a.getAttribute('title') || '').trim();
        return { href: a.getAttribute('href') || '', ok: (a.getAttribute('href') || '').startsWith(WA), name, pos: getComputedStyle(a).position };
      }, WA_PREFIX);
      if (!f) return rec('whatsapp.float', 'FAIL', 'a[data-whatsapp-float] not found');
      rec('whatsapp.float', f.ok && f.name ? 'PASS' : 'FAIL', `href ok:${f.ok} name:"${f.name.slice(0, 40)}" position:${f.pos}`);
    });

    // --- no fake content ---
    await check('content.no-fake', async () => {
      const r = await page.evaluate((HOSTS) => {
        const txt = document.body.innerText;
        const re = new RegExp(HOSTS.join('|').replace(/\./g, '\\.'), 'i');
        const srcs = [];
        document.querySelectorAll('[src],[srcset],[poster],[style]').forEach((e) => ['src', 'srcset', 'poster', 'style'].forEach((a) => { const v = e.getAttribute(a); if (v && re.test(v)) srcs.push(`${e.tagName.toLowerCase()}[${a}]`); }));
        document.querySelectorAll('body *').forEach((e) => { const b = getComputedStyle(e).backgroundImage; if (b && b !== 'none' && re.test(b)) srcs.push('bg:' + e.tagName.toLowerCase()); });
        return { lorem: /lorem ipsum|dolor sit amet/i.test(txt), example: (txt.match(/[\w.-]*example\.(com|org)[\w/.-]*/gi) || []).slice(0, 3), placeholder: (txt.match(/\bPLACEHOLDER\b|\bTODO\b|\bXXX\b/g) || []).length, srcs };
      }, STOCK_HOSTS);
      let jsonHits = [];
      for (const f of ['portfolio.json', 'pricing.json']) {
        try { const s = fs.readFileSync(path.join(ROOT, 'portfolio/content', f), 'utf8'); STOCK_HOSTS.forEach((h) => { if (s.toLowerCase().includes(h)) jsonHits.push(`${f}:${h}`); }); if (/lorem ipsum/i.test(s)) jsonHits.push(`${f}:lorem`); } catch (_) {}
      }
      const issues = [];
      if (r.lorem) issues.push('lorem ipsum visible');
      if (r.example.length) issues.push('example.com visible: ' + r.example.join(','));
      if (r.srcs.length) issues.push('stock host in src: ' + r.srcs.slice(0, 4).join(','));
      if (jsonHits.length) issues.push('content json: ' + jsonHits.join(','));
      if (r.placeholder) issues.push(`${r.placeholder} PLACEHOLDER/TODO tokens visible`);
      rec('content.no-fake', issues.length ? 'FAIL' : 'PASS', issues.length ? issues.join(' | ') : 'no lorem/example.com/stock hosts/placeholders');
    });
    await check('seo.no-placeholder-meta', async () => {
      const bad = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('meta[content], link[rel="canonical"]').forEach((m) => { const v = m.getAttribute('content') || m.getAttribute('href') || ''; if (/example\.com|PLACEHOLDER/i.test(v)) out.push((m.getAttribute('property') || m.getAttribute('name') || m.getAttribute('rel')) + '=' + v.slice(0, 40)); });
        document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => { if (/example\.com|PLACEHOLDER|00000-0000/i.test(s.textContent)) out.push('JSON-LD contains example.com/PLACEHOLDER'); });
        return out;
      });
      rec('seo.no-placeholder-meta', bad.length ? 'WARN' : 'PASS', bad.length ? bad.slice(0, 5).join(' | ') + ' (ok only if url:"" pending deploy domain)' : 'no example.com/PLACEHOLDER in meta/JSON-LD');
    });

    // --- quote form (form#quote-form) ---
    await check('form.validation', async () => {
      const form = await page.$('form#quote-form');
      if (!form) return rec('form.validation', 'FAIL', 'form#quote-form not found');
      const miss = [];
      for (const n of ['name', 'email', 'phone', 'message']) if (!(await form.$(`[name="${n}"]`))) miss.push(n);
      const nSvc = await form.$$eval('input[type="checkbox"][name="services"]', (e) => e.length);
      if (!nSvc) miss.push('checkbox[name=services]');
      rec('form.fields', miss.length ? 'FAIL' : 'PASS', miss.length ? 'missing ' + miss.join(', ') : `name/email/phone/message + ${nSvc} service checkboxes`);
      await page.evaluate(() => { window.__opened = []; });
      const urlBefore = page.url();
      let navigated = false; const onNav = (fr) => { if (fr === page.mainFrame()) navigated = true; }; page.on('framenavigated', onNav);
      let posted = false; const onReq = (r) => { if (r.method() === 'POST') posted = true; }; page.on('request', onReq);
      const submit = (await form.$('button[type="submit"], input[type="submit"]')) || (await form.$('button:not([type="button"])'));
      await submit.scrollIntoViewIfNeeded(); await submit.click(); await sleep(500);
      page.off('framenavigated', onNav); page.off('request', onReq);
      const openedEmpty = await page.evaluate(() => window.__opened.length) + waHits.length;
      if (navigated || posted || page.url() !== urlBefore || openedEmpty) {
        rec('form.blocks-empty', 'FAIL', `empty submit navigated/POSTed/opened WhatsApp (url ${page.url()}, opened ${openedEmpty})`);
        await gotoPage(page); return;
      }
      const st = await form.evaluate((f) => {
        const els = [...f.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea, fieldset')];
        const desc = (e) => (e.getAttribute('aria-describedby') || '').split(/\s+/).some((id) => ((document.getElementById(id) || {}).textContent || '').trim());
        return {
          invalidAria: els.filter((e) => e.getAttribute('aria-invalid') === 'true').map((e) => e.name || e.tagName.toLowerCase()),
          described: els.filter((e) => e.getAttribute('aria-invalid') === 'true' && desc(e)).map((e) => e.name || e.tagName.toLowerCase()),
          svcFlag: !!f.querySelector('fieldset[aria-invalid="true"], [name="services"][aria-invalid="true"], [role="group"][aria-invalid="true"]') ||
            ((document.querySelector('[data-slot="form-status"]') || {}).textContent || '').toLowerCase().includes('servi'),
          live: [...document.querySelectorAll('#orcamento [aria-live], #orcamento [role="alert"], #orcamento [role="status"]')].some((e) => e.textContent.trim()),
          liveExists: !!document.querySelector('#orcamento [aria-live], #orcamento [role="alert"], #orcamento [role="status"]'),
          focused: document.activeElement && (document.activeElement.name || document.activeElement.id),
        };
      });
      rec('form.blocks-empty', 'PASS', 'empty submit blocked (no nav/POST/window.open)');
      rec('form.aria-invalid', st.invalidAria.length ? 'PASS' : 'FAIL', `aria-invalid on [${st.invalidAria.join(',')}]; services error signalled: ${st.svcFlag}`);
      rec('form.error-messages', st.described.length && st.live ? 'PASS' : st.described.length || st.liveExists ? 'WARN' : 'FAIL',
        `aria-describedby w/ text: [${st.described.join(',')}], live region populated: ${st.live} (exists ${st.liveExists}), focus: ${st.focused || '-'}`);

      // invalid email
      await form.$eval('[name="name"]', (e) => { e.value = ''; });
      await (await form.$('[name="name"]')).fill('Teste QA');
      await (await form.$('[name="email"]')).fill('nao-e-email');
      await (await form.$('[name="phone"]')).fill('19 99999-0000');
      await (await form.$('[name="message"]')).fill('Mensagem de teste QA para orçamento.');
      const firstSvc = await form.$('input[type="checkbox"][name="services"]');
      if (firstSvc) await firstSvc.check({ force: true });
      await submit.click(); await sleep(400);
      const emailBad = await form.$eval('[name="email"]', (e) => e.getAttribute('aria-invalid') === 'true' || !e.checkValidity());
      const leaked = (await page.evaluate(() => window.__opened.length)) + waHits.length;
      rec('form.email-format', emailBad && !leaked ? 'PASS' : 'FAIL', emailBad && !leaked ? 'invalid email rejected' : `invalid email accepted (opened ${leaked})`);

      // valid submit -> WhatsApp URL with services + message
      const MSG = 'Mensagem QA: cobertura do evento em dezembro';
      await (await form.$('[name="email"]')).fill('qa.teste@chagas.test');
      await (await form.$('[name="message"]')).fill(MSG);
      const boxes = await form.$$('input[type="checkbox"][name="services"]');
      const pick = boxes.slice(0, 2);
      const labels = [];
      for (const b of pick) {
        await b.check({ force: true });
        labels.push(await b.evaluate((e) => ((e.labels && e.labels[0] && e.labels[0].innerText) || e.value || '').replace(/\s+/g, ' ').replace(/R\$.*$/, '').trim()));
      }
      const values = await Promise.all(pick.map((b) => b.getAttribute('value')));
      const popupP = page.context().waitForEvent('page', { timeout: 1500 }).catch(() => null);
      await submit.click(); await sleep(800);
      const popup = await popupP; if (popup) { waHits.push(popup.url()); await popup.close().catch(() => {}); }
      const opened = await page.evaluate(() => window.__opened.slice());
      const urls = [...opened, ...waHits, page.url()].filter((u) => /wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(u || ''));
      const waLink = await page.$$eval('#orcamento a[href*="wa.me"]', (as) => as.map((a) => a.href)).catch(() => []);
      const candidate = urls[0] || waLink.find((h) => /text=/.test(h));
      if (!candidate) {
        rec('form.whatsapp', 'FAIL', `no WhatsApp URL after valid submit (window.open calls: ${opened.length}, wa.me requests: ${waHits.length})`);
      } else {
        let text = ''; try { text = new URL(candidate).searchParams.get('text') || ''; } catch (_) {}
        const low = text.toLowerCase();
        const missSvc = labels.filter((l, i) => l && !low.includes(l.toLowerCase()) && !(values[i] && low.includes(String(values[i]).toLowerCase())));
        const okNum = candidate.startsWith(WA_PREFIX) || /phone=5519989905361/.test(candidate);
        const okMsg = text.includes(MSG);
        rec('form.whatsapp', okNum && okMsg && !missSvc.length ? 'PASS' : 'FAIL',
          `number:${okNum} message:${okMsg} services missing:[${missSvc.join(',')}] via ${urls[0] ? 'open/nav' : 'link'}; text="${text.slice(0, 120)}"`);
      }
      const status = await page.$eval('[data-slot="form-status"]', (e) => e.innerText).catch(() => '');
      rec('form.no-fake-success', /enviad[oa] com sucesso|mensagem enviada|recebemos/i.test(status) ? 'WARN' : 'PASS', `form-status: "${status.slice(0, 100)}"`);
      const mailto = await page.evaluate((MAIL) => [...document.querySelectorAll('#orcamento a[href^="mailto:"], #orcamento button[data-mailto], #orcamento [data-action="email"]')].map((e) => e.getAttribute('href') || e.outerHTML.slice(0, 60)), EMAIL);
      rec('form.mailto', mailto.length ? (mailto.some((h) => h.includes(EMAIL) || !h.startsWith('mailto')) ? 'PASS' : 'WARN') : 'FAIL', mailto.length ? mailto[0].slice(0, 120) : 'no mailto alternative in #orcamento');
      await gotoPage(page);
    });

    // --- lightbox ---
    await check('lightbox', async () => {
      await gotoPage(page); await sleep(300);
      const trig = (await page.$('[data-lightbox]')) || (await page.$('[data-project] button, [data-project] a'));
      if (!trig) return rec('lightbox.open', 'FAIL', 'no [data-lightbox] trigger');
      await trig.scrollIntoViewIfNeeded(); await trig.focus(); await trig.click(); await sleep(500);
      const dlgSel = '[data-lightbox-dialog], dialog[open], [role="dialog"]';
      const visibleDialog = async () => page.$$eval(dlgSel, (ds) => ds.some((d) => { const s = getComputedStyle(d); const r = d.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 && r.width > 0 && !d.hidden; }));
      if (!(await visibleDialog())) return rec('lightbox.open', 'FAIL', 'no visible dialog after click');
      const info = await page.evaluate((sel) => {
        const d = [...document.querySelectorAll(sel)].find((x) => getComputedStyle(x).display !== 'none' && !x.hidden);
        return { modal: d.tagName === 'DIALOG' || d.getAttribute('aria-modal') === 'true', role: d.tagName === 'DIALOG' || d.getAttribute('role') === 'dialog', focusInside: d.contains(document.activeElement), label: !!(d.getAttribute('aria-label') || d.getAttribute('aria-labelledby')) };
      }, dlgSel);
      rec('lightbox.open', info.role && info.modal ? 'PASS' : 'WARN', `role=dialog:${info.role} aria-modal:${info.modal} labelled:${info.label}`);
      rec('lightbox.focus-in', info.focusInside ? 'PASS' : 'FAIL', info.focusInside ? 'focus moved into dialog' : 'focus not in dialog');
      await page.screenshot({ path: path.join(SHOTS, 'lightbox-1440.png') });
      // focus trap
      let escaped = false;
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        const inside = await page.evaluate((sel) => { const d = [...document.querySelectorAll(sel)].find((x) => getComputedStyle(x).display !== 'none' && !x.hidden); return d && d.contains(document.activeElement); }, dlgSel);
        if (!inside) { escaped = true; break; }
      }
      rec('lightbox.focus-trap', escaped ? 'FAIL' : 'PASS', escaped ? 'Tab left the dialog' : 'focus trapped over 15 Tabs');
      // arrows
      const snap = () => page.evaluate((sel) => { const d = [...document.querySelectorAll(sel)].find((x) => getComputedStyle(x).display !== 'none' && !x.hidden); return d ? (d.querySelector('img') || {}).src + '|' + d.innerText.slice(0, 200) : ''; }, dlgSel);
      const before = await snap(); await page.keyboard.press('ArrowRight'); await sleep(400); const after = await snap();
      rec('lightbox.arrows', before !== after ? 'PASS' : 'WARN', before !== after ? 'ArrowRight changed content' : 'ArrowRight did not change content (single item?)');
      await page.keyboard.press('Escape'); await sleep(500);
      const closed = !(await visibleDialog());
      rec('lightbox.esc', closed ? 'PASS' : 'FAIL', closed ? 'Esc closed dialog' : 'dialog still visible after Esc');
      const back = await trig.evaluate((t) => t === document.activeElement || t.contains(document.activeElement));
      rec('lightbox.focus-return', back ? 'PASS' : 'WARN', back ? 'focus returned to trigger' : 'focus not returned to trigger');
    });

    // --- full-page desktop screenshot ---
    await gotoPage(page).catch(() => {});
    await ctx.close();

    // ===== Responsive pass =====
    const overflow = [], navRes = [];
    for (const w of VIEWPORTS) {
      const c = await browser.newContext({ viewport: { width: w, height: w < 768 ? 800 : 900 }, deviceScaleFactor: 1, hasTouch: w < 768, isMobile: w < 768 });
      const p = await c.newPage();
      try {
        await gotoPage(p);
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
        await sleep(600);
        const o = await p.evaluate(() => {
          const vw = document.documentElement.clientWidth; const sw = document.documentElement.scrollWidth;
          const off = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 3).map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''));
          return { vw, sw, off };
        });
        if (o.sw > o.vw + 1) overflow.push(`${w}px: scrollWidth ${o.sw} > ${o.vw} (${o.off.join(', ')})`);
        await p.screenshot({ path: path.join(SHOTS, `full-${w}.png`), fullPage: true });

        if (w <= 768) {
          const tg = (await p.$('[data-nav-toggle]')) || (await p.$('header button[aria-expanded], nav button[aria-expanded]')) ||
            (await p.getByRole('button', { name: /menu|abrir|navega/i }).first().elementHandle({ timeout: 500 }).catch(() => null));
          if (!tg || !(await tg.isVisible())) { navRes.push({ w, s: 'FAIL', d: 'no visible nav toggle' }); }
          else {
            const ctrl = await tg.getAttribute('aria-controls');
            const menuSel = ctrl ? `#${ctrl}` : '[data-nav-menu], header nav ul, nav ul';
            const menuVis = async () => p.$eval(menuSel, (m) => { const s = getComputedStyle(m); const r = m.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.1 && r.height > 0 && r.right > 0 && r.left < innerWidth; }).catch(() => false);
            const e0 = await tg.getAttribute('aria-expanded');
            const v0 = await menuVis();
            await tg.click(); await sleep(450);
            const e1 = await tg.getAttribute('aria-expanded'); const v1 = await menuVis();
            if (w === 390) await p.screenshot({ path: path.join(SHOTS, `nav-open-${w}.png`) });
            await p.keyboard.press('Escape'); await sleep(400);
            let e2 = await tg.getAttribute('aria-expanded');
            if (e2 === 'true') { await tg.click(); await sleep(400); e2 = (await tg.getAttribute('aria-expanded')) + '(via click)'; }
            const v2 = await menuVis();
            const ok = e0 !== 'true' && e1 === 'true' && v1 && !v2 && String(e2).startsWith('false');
            navRes.push({ w, s: ok ? 'PASS' : 'FAIL', d: `aria-expanded ${e0}->${e1}->${e2}; visible ${v0}->${v1}->${v2}; controls=${ctrl || '-'}` });
            // touch targets
            const small = await p.$$eval('a[href], button', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return e.offsetParent && r.width > 0 && (r.width < 44 || r.height < 44) && !e.closest('p'); }).length);
            if (w === 360 && small) rec('a11y.touch-targets-360', 'WARN', `${small} interactive elements < 44x44px (excl. inline text links)`);
          }
        }
      } catch (e) { overflow.push(`${w}px: exception ${e.message.split('\n')[0]}`); }
      await c.close();
    }
    rec('responsive.no-overflow', overflow.length ? 'FAIL' : 'PASS', overflow.length ? overflow.join(' | ') : VIEWPORTS.join('/') + ' ok');
    navRes.forEach((n) => rec(`nav.mobile-${n.w}`, n.s, n.d));

    // ===== Reduced motion =====
    await check('motion.reduced', async () => {
      const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
      const p = await c.newPage();
      await gotoPage(p); await sleep(600);
      // no scrolling: content must be visible without IntersectionObserver triggering
      const hidden = await p.evaluate(() => {
        const els = [...document.querySelectorAll('[data-reveal], .reveal, section h2, section p, [data-project], [data-pricing-service]')];
        return els.filter((e) => { let o = 1; for (let x = e; x && x !== document.body; x = x.parentElement) { const s = getComputedStyle(x); o *= +s.opacity; if (s.visibility === 'hidden') o = 0; } return o < 0.95; })
          .slice(0, 6).map((e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').join('.') : ''));
      });
      const anims = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && a.effect && a.effect.getTiming().duration > 0 && a.effect.getTiming().iterations === Infinity).length);
      await p.screenshot({ path: path.join(SHOTS, 'reduced-motion-1440.png'), fullPage: true });
      rec('motion.reduced-visible', hidden.length ? 'FAIL' : 'PASS', hidden.length ? 'hidden under reduce: ' + hidden.join(', ') : 'all content visible without scroll');
      rec('motion.reduced-no-infinite', anims ? 'WARN' : 'PASS', `${anims} infinite running animations`);
      await c.close();
    });

    // ===== CLS (lab, desktop + scroll) =====
    await check('perf.cls-lcp', async () => {
      const c = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1 });
      const p = await c.newPage();
      await p.addInitScript(() => {
        window.__cls = 0; window.__lcp = 0;
        new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((l) => l.getEntries().forEach((e) => { window.__lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
      });
      await gotoPage(p);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } });
      await sleep(500);
      const { cls, lcp } = await p.evaluate(() => ({ cls: window.__cls, lcp: window.__lcp }));
      rec('perf.cls', cls < 0.1 ? 'PASS' : 'FAIL', `CLS ${cls.toFixed(3)} (lab, 390px, incl. scroll)`);
      rec('perf.lcp', lcp < 2500 ? 'PASS' : 'FAIL', `LCP ${Math.round(lcp)}ms (localhost, unthrottled — confirm with Lighthouse)`);
      await c.close();
    });
  } finally {
    await browser.close();
    server.close();
  }
}

function summarize() {
  const order = { FAIL: 0, WARN: 1, PASS: 2 };
  const counts = { PASS: 0, WARN: 0, FAIL: 0 };
  results.forEach((r) => counts[r.status]++);
  const color = { PASS: '\x1b[32m', WARN: '\x1b[33m', FAIL: '\x1b[31m' };
  console.log(`\nQA — ${URL_}\n` + '-'.repeat(72));
  [...results].sort((a, b) => order[a.status] - order[b.status]).forEach((r) =>
    console.log(`${color[r.status]}${r.status.padEnd(4)}\x1b[0m ${r.id.padEnd(28)} ${r.detail.slice(0, 220)}`));
  console.log('-'.repeat(72) + `\nPASS ${counts.PASS}  WARN ${counts.WARN}  FAIL ${counts.FAIL}`);
  fs.writeFileSync(REPORT, JSON.stringify({ url: URL_, date: new Date().toISOString(), counts, results }, null, 2));
  console.log(`Report: ${path.relative(process.cwd(), REPORT)}  Screenshots: ${path.relative(process.cwd(), SHOTS)}/`);
  return counts.FAIL ? 1 : 0;
}

main().then(() => process.exit(summarize())).catch((e) => {
  console.error('HARNESS ERROR:', e);
  rec('harness', 'FAIL', e.message);
  summarize();
  process.exit(2);
});
