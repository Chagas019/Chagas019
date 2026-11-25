// QA do Museum Ecclesiae: node tests/qa.js  (sobe um servidor local e testa no Chromium)
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png" };
const server = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  if (f.endsWith("/")) f += "index.html";
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r);
});
let fails = 0, oks = 0;
const ok = (c, m) => { if (c) oks++; else { fails++; console.log("FALHA:", m); } };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  global.window = {}; require(path.join(ROOT, "js/data.js")); const D = window.ME_DATA;
  const pages = ["index.html", "exposicoes.html", "santos.html", "historia.html", "arte-sacra.html",
    ...D.exhibitions.map(e => "exposicoes.html?e=" + e.id), ...D.saints.map(s => "santos.html?s=" + s.id),
    ...["pintura", "escultura", "arquitetura", "manuscrito", "liturgico"].map(c => "arte-sacra.html?c=" + c)];
  // dados: referências e arquivos
  const ids = new Set(D.artworks.map(a => a.id));
  D.artworks.forEach(a => { ok(fs.existsSync(path.join(ROOT, a.image)) && fs.statSync(path.join(ROOT, a.image)).size > 1000, "imagem ausente " + a.image); ok(a.credit && a.sourceUrl, "obra sem crédito/fonte " + a.id); });
  D.exhibitions.forEach(e => e.artworks.forEach(i => ok(ids.has(i), `expo ${e.id} → ${i}`)));
  D.saints.forEach(s => { s.artworks.forEach(i => ok(ids.has(i), `santo ${s.id} → ${i}`)); ok((s.sources || []).length, "santo sem fonte " + s.id); });
  D.timeline.forEach(t => { ok(!t.artwork || ids.has(t.artwork), "evento → " + t.artwork); ok(D.periods.some(p => p.id === t.period), "evento sem período " + t.title); ok((t.sources || []).length, "evento sem fonte " + t.title); });

  for (const vp of [{ width: 1440, height: 900, name: "desktop" }, { width: 375, height: 760, name: "mobile" }]) {
    const ctx = await browser.newContext({ viewport: vp }); const pg = await ctx.newPage();
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => m.type() === "error" && errs.push(m.text()));
    const bad = []; pg.on("response", r => r.url().startsWith(base) && r.status() >= 400 && bad.push(r.url()));
    for (const u of pages) {
      await pg.goto(base + u, { waitUntil: "load" });
      // força o carregamento de imagens lazy
      await pg.evaluate(async () => { document.querySelectorAll("img[loading=lazy]").forEach(i => i.loading = "eager"); await new Promise(r => setTimeout(r, 300)); });
      await pg.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 15000 }).catch(() => {});
      const broken = await pg.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.src));
      ok(!broken.length, `${vp.name} ${u}: imagens quebradas ${broken.join(", ")}`);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(ov <= 1, `${vp.name} ${u}: rolagem horizontal ${ov}px`);
      const h1 = await pg.locator("h1").count(); ok(h1 === 1, `${vp.name} ${u}: ${h1} h1`);
      const noAlt = await pg.evaluate(() => [...document.images].filter(i => !i.hasAttribute("alt")).length); ok(!noAlt, `${u}: img sem alt`);
      // links internos
      const links = await pg.evaluate(() => [...document.querySelectorAll("a[href]")].map(a => a.getAttribute("href")).filter(h => h && !/^(https?:|#|mailto:)/.test(h)));
      for (const l of new Set(links)) ok(fs.existsSync(path.join(ROOT, l.split(/[?#]/)[0])), `${u}: link quebrado ${l}`);
      const emptyLinks = await pg.evaluate(() => [...document.querySelectorAll("a")].filter(a => !a.getAttribute("href") || a.getAttribute("href") === "#" && !a.hasAttribute("data-art")).length);
      ok(!emptyLinks, `${u}: ${emptyLinks} links sem destino`);
      const noName = await pg.evaluate(() => [...document.querySelectorAll("button, a")].filter(b => b.offsetParent && !(b.getAttribute("aria-label") || b.textContent.trim())).length);
      ok(!noName, `${u}: ${noName} controles sem nome acessível`);
    }
    // interações
    await pg.goto(base + "index.html");
    if (vp.name === "mobile") {
      await pg.click("#menu-btn"); ok(await pg.locator("#nav.open").count() === 1, "menu mobile não abre");
      await pg.click('#nav a[href="santos.html"]'); await pg.waitForURL(/santos/); ok(true, "");
      await pg.goto(base + "index.html");
    }
    const scenes = await pg.locator(".scene").count(); ok(scenes === 3, "home: cenas " + scenes);
    await pg.evaluate(() => scrollTo(0, document.getElementById("stage").offsetHeight * .8)); await pg.waitForTimeout(400);
    ok(await pg.locator(".scene.active").last().evaluate(e => [...e.parentNode.children].indexOf(e)) === 2, "home: cena 3 não ativa ao rolar");
    await pg.locator("#strip [data-art]").first().scrollIntoViewIfNeeded(); await pg.locator("#strip [data-art]").first().click();
    ok(await pg.locator(".lightbox.open").count() === 1, "lightbox não abre"); await pg.keyboard.press("ArrowRight");
    ok((await pg.locator(".lb-info .kicker").textContent()).startsWith("2 /"), "lightbox não avança");
    await pg.keyboard.press("Escape"); await pg.waitForTimeout(450); ok(await pg.locator(".lightbox.open").count() === 0, "lightbox não fecha");
    await pg.goto(base + "exposicoes.html?e=" + D.exhibitions.find(e => e.artworks.every(i => ids.has(i)) && e.artworks.length > 2).id);
    const t1 = await pg.locator("#v-piece h2").textContent(); await pg.click("#v-next"); await pg.waitForTimeout(400);
    ok(t1 !== await pg.locator("#v-piece h2").textContent(), "exposição: próxima não muda"); ok(/&p=2/.test(pg.url()), "exposição: URL não atualiza");
    await pg.click("#v-prev"); await pg.waitForTimeout(400); ok(t1 === await pg.locator("#v-piece h2").textContent(), "exposição: anterior falhou");
    await pg.locator(".dots button").nth(2).click(); await pg.waitForTimeout(400); ok((await pg.locator("#v-count").textContent()).startsWith("3"), "exposição: pontos");
    await pg.click("#v-zoom"); ok(await pg.locator(".lightbox.open").count() === 1, "exposição: zoom"); await pg.keyboard.press("Escape");
    await pg.goto(base + "arte-sacra.html"); const all = await pg.locator(".work").count();
    await pg.click('.chip[data-c="escultura"]'); const sc = await pg.locator(".work").count();
    ok(sc > 0 && sc < all, `arte: filtro ${sc}/${all}`); ok(/c=escultura/.test(pg.url()), "arte: URL do filtro");
    await pg.goto(base + "historia.html"); await pg.click(`.chip[data-period="${D.periods[2].id}"]`); await pg.waitForTimeout(800);
    ok(/#/.test(pg.url()), "história: navegação por período");
    await pg.goto(base + "santos.html?s=nao-existe"); ok(await pg.locator(".index-list li").count() === D.saints.length, "santos: id inválido não cai na lista");
    ok(!errs.length, `${vp.name}: erros de console ${[...new Set(errs)].join(" | ")}`);
    ok(!bad.length, `${vp.name}: respostas 4xx/5xx ${[...new Set(bad)].join(" ")}`);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${oks} verificações ok, ${fails} falhas.`); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
