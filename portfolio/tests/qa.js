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

    // --- sections ---
    await check('sections.present', async () => {
      const ids = ['trabalhos', 'servicos', 'investimento', 'sobre', 'contato'];
      const missing = [];
      for (const id of ids) if (!(await page.$('#' + id))) missing.push('#' + id);
      rec('sections.present', missing.length ? 'FAIL' : 'PASS', missing.length ? 'missing ' + missing.join(', ') : ids.length + ' sections');
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

    // --- content: projects & pricing ---
    await check('content.projects', async () => {
      let expected = null;
      try { const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'portfolio/content/portfolio.json'), 'utf8')); const arr = Array.isArray(j) ? j : (j.projects || j.items || []); expected = arr.length; } catch (_) {}
      let n = await page.$$eval('[data-project]', (e) => e.length);
      if (!n) n = await page.$$eval('#trabalhos article, #trabalhos li, #trabalhos figure', (e) => e.length).catch(() => 0);
      const st = !n ? 'FAIL' : expected != null && n !== expected ? 'WARN' : 'PASS';
      rec('content.projects', st, `${n} projects rendered${expected != null ? `, ${expected} in portfolio.json` : ', portfolio.json unreadable'}`);
    });
    await check('content.pricing', async () => {
      const svc = await page.$$('[data-pricing-service]');
      if (!svc.length) {
        const txt = await page.$eval('#investimento', (e) => e.innerText).catch(() => '');
        return rec('content.pricing', 'FAIL', `0 [data-pricing-service] (section text ${txt.length} chars)`);
      }
      const tiers = await Promise.all(svc.map((s) => s.$$eval('[data-pricing-tier]', (t) => t.length)));
      const badT = tiers.filter((t) => t !== EXPECTED_TIERS).length;
      const hasPrice = await page.$eval('#investimento', (e) => /R\$\s?\d/.test(e.innerText)).catch(() => false);
      rec('content.pricing', svc.length === EXPECTED_SERVICES && !badT ? (hasPrice ? 'PASS' : 'WARN') : 'FAIL',
        `${svc.length}/${EXPECTED_SERVICES} services, tiers per service [${tiers.join(',')}]${hasPrice ? '' : ', no "R$" price text'}`);
    });

    // --- form validation ---
    await check('form.validation', async () => {
      const form = (await page.$('form#contact-form')) || (await page.$('#contato form'));
      if (!form) return rec('form.validation', 'FAIL', 'form#contact-form not found');
      for (const n of ['name', 'email', 'message']) if (!(await form.$(`[name="${n}"]`))) rec('form.fields', 'FAIL', `missing [name=${n}]`);
      const urlBefore = page.url();
      let navigated = false; const onNav = () => { navigated = true; }; page.on('framenavigated', onNav);
      let posted = false; const onReq = (r) => { if (r.method() === 'POST') posted = true; }; page.on('request', onReq);
      const submit = (await form.$('button[type="submit"], input[type="submit"]')) || (await form.$('button:not([type="button"])'));
      if (submit) await submit.click(); else await form.evaluate((f) => f.requestSubmit());
      await sleep(500);
      page.off('framenavigated', onNav); page.off('request', onReq);
      if (navigated || posted || page.url() !== urlBefore) {
        rec('form.blocks-empty', 'FAIL', `empty submit navigated/POSTed (url now ${page.url()})`);
        rec('form.aria-invalid', 'FAIL', 'not evaluated: page navigated on empty submit');
        await gotoPage(page); return;
      }
      const st = await form.evaluate((f) => {
        const els = [...f.querySelectorAll('input:not([type=hidden]):not([type=submit]), textarea')];
        return {
          invalidAria: els.filter((e) => e.getAttribute('aria-invalid') === 'true').map((e) => e.name),
          described: els.filter((e) => e.getAttribute('aria-invalid') === 'true' && e.getAttribute('aria-describedby') &&
            e.getAttribute('aria-describedby').split(/\s+/).some((id) => (document.getElementById(id) || {}).textContent)).map((e) => e.name),
          nativeInvalid: els.filter((e) => !e.checkValidity()).map((e) => e.name),
          live: !!f.querySelector('[aria-live], [role="alert"]') || !!document.querySelector('#contato [aria-live], #contato [role="alert"]'),
          focused: document.activeElement && document.activeElement.name,
        };
      });
      rec('form.blocks-empty', 'PASS', 'empty submit blocked');
      rec('form.aria-invalid', st.invalidAria.length ? 'PASS' : 'FAIL', `aria-invalid on [${st.invalidAria.join(',')}] (native invalid [${st.nativeInvalid.join(',')}])`);
      rec('form.error-messages', st.described.length && st.live ? 'PASS' : st.described.length || st.live ? 'WARN' : 'FAIL',
        `aria-describedby w/ text: [${st.described.join(',')}], live region: ${st.live}, focus on: ${st.focused || '-'}`);
      // invalid email
      const email = await form.$('[name="email"]');
      if (email) {
        await email.fill('not-an-email'); await (await form.$('[name="name"]'))?.fill('QA Bot'); await (await form.$('[name="message"]'))?.fill('Mensagem de teste QA com conteúdo suficiente.');
        const u0 = page.url(); if (submit) await submit.click(); await sleep(300);
        if (page.url() !== u0) { rec('form.email-format', 'FAIL', 'invalid email submitted (navigated)'); await gotoPage(page); return; }
        const inv = await email.evaluate((e) => e.getAttribute('aria-invalid') === 'true' || !e.checkValidity());
        rec('form.email-format', inv ? 'PASS' : 'FAIL', inv ? 'invalid email rejected' : 'invalid email accepted');
      }
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
