'use strict';
/*
 * v4 extra checks (pricing accordion, price-row preselect, "Ver valores", motion clips in lightbox,
 * hover stability, scrolled header vs mobile menu, WA float vs every submit, external link targets,
 * media/capturas load, deep element overflow). Called from qa.js: await runV4(browser, URL_, rec).
 */
module.exports = async function runV4(browser, URL_, recRaw) {
const rec = (id, ok, d) => recRaw(id, ok === true ? 'PASS' : ok === 'WARN' ? 'WARN' : 'FAIL', d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function ctx(browser, w, opts = {}) {
  const c = await browser.newContext({ viewport: { width: w, height: opts.h || 800 }, reducedMotion: opts.rm || 'no-preference', deviceScaleFactor: 1 });
  await c.addInitScript(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await c.route(/wa\.me|instagram\.com/, (r) => r.abort());
  const p = await c.newPage();
  p.__errs = []; p.on('pageerror', (e) => p.__errs.push(e.message));
  p.__bad = []; p.on('response', (r) => { if (r.status() >= 400) p.__bad.push(r.status() + ' ' + r.url()); });
  p.on('requestfailed', (r) => { if (!/wa\.me|instagram/.test(r.url()) && !/ERR_ABORTED/.test((r.failure() || {}).errorText || '')) p.__bad.push('failed ' + r.url() + ' ' + (r.failure() || {}).errorText); });
  await p.goto(URL_, { waitUntil: 'networkidle' });
  await sleep(300);
  return { c, p };
}
  const b = browser;
  {
    // 1. accordion keyboard + aria-expanded (390)
    { const { c, p } = await ctx(b, 390, { rm: 'reduce' });
      const st = await p.$$eval('[data-pricing-group] .disclosure', (bs) => bs.map((x) => [x.getAttribute('aria-expanded'), document.getElementById(x.getAttribute('aria-controls'))?.hidden]));
      const initOk = st.length >= 2 && st[0][0] === 'true' && st[0][1] === false && st.slice(1).every(([e, h]) => e === 'false' && h === true);
      const btn = p.locator('[data-pricing-group] .disclosure').nth(1);
      await btn.focus(); await p.keyboard.press('Enter'); await sleep(100);
      const a1 = await btn.getAttribute('aria-expanded'); const v1 = await p.locator('[data-pricing-group]').nth(1).locator('.pricing__items').isVisible();
      await p.keyboard.press('Space'); await sleep(100);
      const a2 = await btn.getAttribute('aria-expanded'); const v2 = await p.locator('[data-pricing-group]').nth(1).locator('.pricing__items').isVisible();
      rec('pricing.accordion-kbd', initOk && a1 === 'true' && v1 && a2 === 'false' && !v2, `init ${JSON.stringify(st)} enter:${a1}/${v1} space:${a2}/${v2}`);
      const tgt = await btn.evaluate((x) => { const r = x.getBoundingClientRect(); return Math.round(r.height); });
      rec('pricing.accordion-target', tgt >= 44, `button height ${tgt}px`);
      // 1b. desktop: no disclosure buttons, all visible
      await p.setViewportSize({ width: 1024, height: 800 }); await sleep(200);
      const d = await p.evaluate(() => ({ btns: document.querySelectorAll('[data-pricing-group] .disclosure').length, hidden: [...document.querySelectorAll('[data-pricing-group] .pricing__items')].filter((x) => x.hidden).length }));
      // back to mobile: does user state survive?
      await p.setViewportSize({ width: 390, height: 800 }); await sleep(200);
      rec('pricing.accordion-desktop', d.btns === 0 && d.hidden === 0, `>=900px: ${d.btns} toggles, ${d.hidden} hidden lists`);
      // 2. Ver valores -> right group open
      const links = await p.$$eval('a[href^="#preco-"]', (as) => as.map((a) => a.getAttribute('href')));
      const bad = [];
      for (const href of [...new Set(links)]) {
        await p.evaluate(() => document.querySelectorAll('[data-pricing-group] .disclosure[aria-expanded=true]').forEach((x) => x.click()));
        const l = p.locator(`a[href="${href}"]`).first();
        if (!(await l.isVisible())) { bad.push(href + ' link hidden'); continue; }
        await l.click(); await sleep(400);
        const r = await p.evaluate((h) => { const g = document.querySelector(h); if (!g) return 'no target';
          const list = g.querySelector('.pricing__items'); const rr = g.getBoundingClientRect(); const hh = document.querySelector('.site-header').getBoundingClientRect().bottom;
          return (list && !list.hidden ? '' : 'closed ') + (rr.top >= hh - 2 && rr.top < innerHeight ? '' : `top=${Math.round(rr.top)} hdr=${Math.round(hh)}`); }, href);
        if (r.trim()) bad.push(href + ': ' + r);
      }
      rec('pricing.ver-valores', links.length > 0 && !bad.length, `${links.length} links (${[...new Set(links)].join(',')}) ${bad.join('; ')}`);
      // 3. price row -> form + precheck
      const items = p.locator('a.pricing__item-cta[data-service]');
      const n = await items.count(); const fails = [];
      for (const i of [0, n - 1]) {
        await p.evaluate(() => { document.querySelectorAll('#quote-form input[name=services]').forEach((x) => { x.checked = false; }); window.scrollTo(0, 0); });
        const it = items.nth(i); const svc = await it.getAttribute('data-service');
        const grp = await it.evaluate((a) => a.closest('[data-pricing-group]').id);
        await p.evaluate((g) => { const b = document.querySelector(`#${g} .disclosure`); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); }, grp);
        await it.scrollIntoViewIfNeeded(); await it.click(); await sleep(700);
        const r = await p.evaluate((s) => { const box = [...document.querySelectorAll('#quote-form input[name=services]')].find((x) => x.value === s);
          const f = document.getElementById('quote-form').getBoundingClientRect(); const hh = document.querySelector('.site-header').getBoundingClientRect().bottom;
          return { exists: !!box, checked: !!box?.checked, top: Math.round(f.top), hdr: Math.round(hh), hash: location.hash }; }, svc);
        if (!r.exists || !r.checked || r.top < r.hdr - 2 || r.top > 400) fails.push(`${svc}: ${JSON.stringify(r)}`);
      }
      // whole row as target?
      const rowClick = await p.evaluate(() => { const li = document.querySelector('[data-pricing-item]'); const a = li.querySelector('a[data-service]'); const lr = li.getBoundingClientRect(), ar = a.getBoundingClientRect();
        return { li: Math.round(lr.width * lr.height), a: Math.round(ar.width * ar.height), aH: Math.round(ar.height) }; });
      rec('pricing.row-preselect', n === require('../content/pricing.json').groups.reduce((t, g) => t + g.items.length, 0) && !fails.length, `${n} CTAs; ${fails.join('; ') || 'first/last scroll to form & checked'}; row area ${rowClick.li} vs link ${rowClick.a} (h ${rowClick.aH})`);
      rec('pricing.cta-target', rowClick.aH >= 44 ? true : 'WARN', `CTA height ${rowClick.aH}px`);
      // all data-service values map to a checkbox
      const unmapped = await p.evaluate(() => { const vals = new Set([...document.querySelectorAll('#quote-form input[name=services]')].map((x) => x.value));
        return [...document.querySelectorAll('a[data-service]')].map((a) => a.dataset.service).filter((s) => !vals.has(s)); });
      rec('form.data-service-map', !unmapped.length, unmapped.length ? 'unmapped: ' + unmapped.join(' | ') : 'all a[data-service] map to a checkbox');
      await c.close(); }

    // 4. lightbox video: Brabo + Comunica+Fé, motion & reduce
    for (const rm of ['no-preference', 'reduce']) {
      const { c, p } = await ctx(b, 1440, { rm });
      for (const id of ['brabo-club', 'comunica-fe']) {
        const trig = p.locator(`[data-project="${id}"] [data-lightbox]`).first();
        await trig.scrollIntoViewIfNeeded(); await trig.click(); await sleep(1500);
        const v = await p.evaluate(() => { const d = document.querySelector('[data-lightbox-dialog]'); const x = d && d.querySelector('video');
          return x ? { muted: x.muted, loop: x.loop, autoplay: x.autoplay, controls: x.controls, paused: x.paused, t: x.currentTime, ready: x.readyState, err: x.error && x.error.code, open: !d.hidden } : { none: true, open: d && !d.hidden }; });
        const ok = rm === 'reduce' ? (v.paused && v.controls && !v.autoplay) : (v.muted && v.loop && !v.paused && !v.controls && v.t > 0);
        rec(`lightbox.video-${id}-${rm === 'reduce' ? 'reduce' : 'motion'}`, !!ok && !v.err, JSON.stringify(v));
        await p.keyboard.press('Escape'); await sleep(200);
        const closed = await p.evaluate(() => { const d = document.querySelector('[data-lightbox-dialog]'); return { hidden: d.hidden, vids: d.querySelectorAll('video').length, inert: document.querySelectorAll('[inert]').length, locked: document.documentElement.classList.contains('is-locked') }; });
        const fr = await trig.evaluate((t) => t === document.activeElement);
        rec(`lightbox.esc-${id}-${rm === 'reduce' ? 'reduce' : 'motion'}`, closed.hidden && !closed.vids && !closed.inert && !closed.locked && fr, JSON.stringify({ ...closed, focusReturn: fr }));
      }
      if (rm === 'reduce') {
        // navigate through brabo items, ensure images load
        const trig = p.locator('[data-project="brabo-club"] [data-lightbox]').first(); await trig.click(); await sleep(300);
        const broken = [];
        for (let i = 0; i < 3; i++) { await p.keyboard.press('ArrowRight'); await sleep(800);
          const s = await p.evaluate(() => { const i = document.querySelector('[data-lightbox-dialog] img'); return i ? (i.complete && i.naturalWidth > 0 ? '' : 'broken ' + i.currentSrc) : ''; }); if (s) broken.push(s); }
        rec('lightbox.brabo-images', !broken.length, broken.join(', ') || 'all frames load');
        await p.keyboard.press('Escape');
      }
      rec(`errors.${rm}`, !p.__errs.length, p.__errs.join(' | ') || 'no page errors');
      await c.close();
    }

    // 4b. lightbox fits the viewport (close/next/counter reachable) on mobile/tablet
    { const bad = [];
      for (const w of [390, 768, 1024]) { const { c, p } = await ctx(b, w, { rm: 'reduce' });
        for (const id of ['brabo-club', 'comunica-fe']) {
          await p.locator(`[data-project="${id}"] [data-lightbox]`).first().click(); await sleep(500);
          for (let i = 0; i < 2; i++) {
            const r = await p.evaluate(() => { const d = document.querySelector('[data-lightbox-dialog]'); const vw = document.documentElement.clientWidth;
              const off = ['[data-lightbox-close]', '[data-lightbox-next]', '.lightbox__frame', '.lightbox__media'].map((s) => [s, d.querySelector(s)]).filter(([, e]) => e && !e.hidden)
                .filter(([, e]) => { const r = e.getBoundingClientRect(); return r.right > vw + 1 || r.left < -1; }).map(([s, e]) => `${s}→${Math.round(e.getBoundingClientRect().right)}`);
              return off; });
            if (r.length) bad.push(`${w} ${id}#${i}: ${r.join(',')}`);
            await p.keyboard.press('ArrowRight'); await sleep(400);
          }
          await p.keyboard.press('Escape'); await sleep(200);
        }
        await c.close(); }
      rec('lightbox.fits-viewport', !bad.length, bad.join('; ') || 'controls and media inside viewport at 390/768/1024'); }

    // 5. hover layout shift (1440)
    { const { c, p } = await ctx(b, 1440);
      const sels = ['.pricing__item', '.product-card', '.selected-card', '.featured__media', '.project-index__link', '.mosaic__btn', '.btn', '.area', '.curation__block', '.site-nav a', '.section__cta-link'];
      const shifts = [];
      for (const s of sels) {
        const els = p.locator(s); const k = await els.count(); if (!k) continue;
        const el = els.first(); await el.scrollIntoViewIfNeeded(); await p.mouse.move(0, 0); await sleep(350);
        const snap = () => p.evaluate((s) => { const e = document.querySelector(s); const sib = e.nextElementSibling || e.parentElement.nextElementSibling; const par = e.parentElement.getBoundingClientRect();
          const r = (sib || e).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.left), Math.round(par.height), Math.round(par.width)]; }, s);
        const before = await snap(); await el.hover({ force: true }); await sleep(450); const after = await snap();
        if (before.some((x, i) => Math.abs(x - after[i]) > 1)) shifts.push(`${s} ${before}→${after}`);
      }
      rec('hover.no-layout-shift', !shifts.length, shifts.join('; ') || `${sels.length} selectors stable`);
      await c.close(); }

    // 6. header shrink vs mobile menu
    for (const w of [360, 390]) { const { c, p } = await ctx(b, w);
      await p.evaluate(() => window.scrollTo(0, 3000)); await sleep(600);
      const scrolled = await p.evaluate(() => document.querySelector('.site-header').classList.contains('is-scrolled'));
      await p.click('[data-nav-toggle]'); await sleep(500);
      const r = await p.evaluate(() => { const h = document.querySelector('.site-header').getBoundingClientRect(); const m = document.querySelector('[data-nav-menu]');
        const links = [...m.querySelectorAll('a')].map((a) => a.getBoundingClientRect()); const t = document.querySelector('[data-nav-toggle]').getBoundingClientRect();
        const firstLinkTop = Math.min(...links.map((l) => l.top)); const lastBottom = Math.max(...links.map((l) => l.bottom));
        // first link not under the header bar (or the toggle)
        const top = links[0]; const hit = document.elementFromPoint(top.left + top.width / 2, top.top + top.height / 2);
        const tHit = document.elementFromPoint(t.left + t.width / 2, t.top + t.height / 2);
        return { hdrBottom: Math.round(h.bottom), firstLinkTop: Math.round(firstLinkTop), lastBottom: Math.round(lastBottom), vh: innerHeight, linkHit: !!(hit && hit.closest('[data-nav-menu] a')), toggleHit: !!(tHit && tHit.closest('[data-nav-toggle]')) }; });
      rec(`nav.scrolled-menu-${w}`, scrolled && r.linkHit && r.toggleHit && r.lastBottom <= r.vh, JSON.stringify({ scrolled, ...r }));
      // click a link closes and lands
      await p.locator('[data-nav-menu] a[href="#orcamento"]').click(); await sleep(2500);
      const land = await p.evaluate(() => ({ exp: document.querySelector('[data-nav-toggle]').getAttribute('aria-expanded'), top: Math.round(document.getElementById('orcamento').getBoundingClientRect().top), hdr: Math.round(document.querySelector('.site-header').getBoundingClientRect().bottom) }));
      rec(`nav.link-closes-${w}`, land.exp === 'false' && land.top >= land.hdr - 2 && land.top < 200, JSON.stringify(land));
      await c.close(); }

    // 7. WA float vs all submit buttons + CTA buttons at 360/390
    for (const w of [360, 390]) { const { c, p } = await ctx(b, w, { rm: 'reduce' });
      const btns = await p.$$eval('#quote-form button[type=submit], #quote-form [type=submit]', (x) => x.length);
      const bad = [];
      for (let i = 0; i < btns; i++) {
        const btn = p.locator('#quote-form [type=submit]').nth(i);
        for (const pos of ['start', 'center', 'end']) {
          await btn.evaluate((e, pos) => e.scrollIntoView({ block: pos }), pos); await sleep(150);
          const r = await btn.evaluate((e) => { const a = e.getBoundingClientRect(); const f = document.querySelector('[data-whatsapp-float]'); const b = f.getBoundingClientRect();
            const ov = !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom) && getComputedStyle(f).visibility !== 'hidden' && getComputedStyle(f).opacity !== '0';
            return { ov, txt: e.textContent.trim().slice(0, 20) }; });
          if (r.ov) bad.push(`${r.txt}@${pos}`);
        }
      }
      // hero meta coverage
      await p.evaluate(() => window.scrollTo(0, 0)); await sleep(150);
      const hero = await p.evaluate(() => { const f = document.querySelector('[data-whatsapp-float]').getBoundingClientRect();
        return [...document.querySelectorAll('#home a, #home .btn, #home .hero__meta')].filter((e) => e.offsetParent).filter((e) => { const a = e.getBoundingClientRect(); return !(a.right <= f.left || a.left >= f.right || a.bottom <= f.top || a.top >= f.bottom); }).map((e) => e.className || e.tagName); });
      rec(`whatsapp.float-all-submits-${w}`, btns === 0 ? false : bad.length ? 'WARN' : true, `${btns} submit buttons; overlaps: ${bad.join(', ') || 'none'}; hero overlaps: ${hero.join(',') || 'none'}`);
      await c.close(); }

    // 8. external links
    { const { c, p } = await ctx(b, 1440);
      const ext = await p.$$eval('a[href]', (as) => as.map((a) => ({ h: a.href, t: a.target, rel: a.rel, txt: (a.getAttribute('aria-label') || a.textContent).trim().slice(0, 30) })).filter((a) => !a.h.startsWith(location.origin)));
      const bad = ext.filter((a) => {
        if (a.h.startsWith('https://wa.me/')) return !/^https:\/\/wa\.me\/5519989905361(\?text=[^#]+)?$/.test(a.h) || (a.t === '_blank' && !/noopener/.test(a.rel));
        if (a.h.includes('instagram.com')) return a.h !== 'https://www.instagram.com/chagas_catolico/' || (a.t === '_blank' && !/noopener/.test(a.rel));
        if (a.h.startsWith('mailto:')) return !/^mailto:hh3356577@gmail\.com(\?.*)?$/.test(a.h);
        if (a.h.startsWith('tel:')) return false;
        return a.t === '_blank' && !/noopener/.test(a.rel);
      });
      const kinds = ext.reduce((m, a) => { const k = a.h.split(/[/:?]/).filter(Boolean)[1] || a.h.split(':')[0]; m[k] = (m[k] || 0) + 1; return m; }, {});
      const other = ext.filter((a) => !/wa\.me|instagram\.com|mailto:|tel:/.test(a.h)).map((a) => a.h);
      // wa.me text decodes cleanly
      const waTexts = ext.filter((a) => a.h.includes('?text=')).map((a) => { try { return decodeURIComponent(a.h.split('?text=')[1]); } catch (e) { return 'BAD-ENC ' + a.h; } });
      rec('links.external-targets', !bad.length, `${ext.length} external ${JSON.stringify(kinds)}; bad: ${bad.map((a) => a.h).join(' ') || 'none'}; other: ${other.join(' ') || 'none'}; wa texts ok: ${!waTexts.some((t) => t.startsWith('BAD'))}`);
      await c.close(); }

    // 9. All images + media load, incl capturas/ and media/*motion*
    { const { c, p } = await ctx(b, 1440);
      await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 80)); } });
      await sleep(1500);
      const imgs = await p.$$eval('img', (is) => is.map((i) => ({ s: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })));
      const broken = imgs.filter((i) => !i.ok).map((i) => i.s);
      const posters = await p.$$eval('video[poster]', (v) => v.map((x) => x.poster));
      // fetch every media path referenced in portfolio.json + motion posters + capturas
      const refs = await p.evaluate(async () => { const j = await (await fetch('content/portfolio.json')).json(); const s = new Set();
        JSON.stringify(j, (k, v) => { if ((k === 'src' || k === 'poster') && typeof v === 'string') s.add(v); return v; }); return [...s]; });
      const man = await p.evaluate(async () => { try { return await (await fetch('media/manifest.json')).json(); } catch (e) { return null; } });
      const extra = [];
      if (man) JSON.stringify(man, (k, v) => { if (typeof v === 'string' && /\.(avif|webp|jpe?g|png|mp4)$/.test(v) && /capturas|motion/.test(v)) extra.push(v); return v; });
      const all = [...new Set([...refs, ...posters, ...extra])];
      const st = await p.evaluate(async (all) => Promise.all(all.map(async (u) => { try { const r = await fetch(new URL(u, location.href), { method: 'HEAD' }); return [u, r.status]; } catch (e) { return [u, 'ERR']; } })), all);
      const bad = st.filter(([, s]) => s !== 200);
      const motion = st.filter(([u]) => /capturas|motion/.test(u)).length;
      rec('media.all-load', !broken.length && !bad.length && !p.__bad.length, `${imgs.length} <img> (${broken.length} broken ${broken.slice(0, 3).join(' ')}); ${st.length} refs HEAD (${motion} capturas/motion), bad: ${bad.map((x) => x.join(' ')).join(', ') || 'none'}; net errors: ${p.__bad.slice(0, 4).join(', ') || 'none'}`);
      await c.close(); }

    // 10. overflow + per-element overflow at viewports, reduce, menu open too
    { const bad = [];
      for (const w of [360, 390, 768, 1024, 1440, 1920]) { const { c, p } = await ctx(b, w, { rm: 'reduce' });
        await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
        await sleep(300);
        // open all disclosures too
        await p.evaluate(() => document.querySelectorAll('.disclosure[aria-expanded=false]').forEach((x) => x.click()));
        const r = await p.evaluate(() => { const sw = document.documentElement.scrollWidth; const cw = document.documentElement.clientWidth;
          const offs = [...document.querySelectorAll('body *')].filter((e) => { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') return false; if (e.closest('.form__hp, .sr-only, .visually-hidden, .skip-link, [aria-hidden=true]')) return false; const r = e.getBoundingClientRect(); if (!r.width) return false;
            let a = e.parentElement; while (a && a !== document.body) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return false; a = a.parentElement; }
            return r.right > cw + 1 || r.left < -1; }).slice(0, 4).map((e) => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]);
          return { sw, cw, offs }; });
        if (r.sw > r.cw || r.offs.length) bad.push(`${w}: sw ${r.sw}/${r.cw} ${r.offs.join(',')}`);
        await c.close(); }
      rec('responsive.no-overflow-deep', !bad.length, bad.join('; ') || 'no page or element overflow, accordions open'); }
  }
};
