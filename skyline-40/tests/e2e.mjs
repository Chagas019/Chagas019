/**
 * Testes de ponta a ponta do SKYLINE 40 num Chromium real (WebGL por software).
 * Uso: npm run build && npx vite preview --port 4173 &  →  npm run e2e
 * Variáveis: BASE_URL (padrão http://localhost:4173/), CHROMIUM_PATH, SCREENS=1 (salva capturas em tests/screens).
 *
 * Verifica que os controles não são decorativos: cada botão muda o estado e/ou a câmera.
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const SCREENS = process.env.SCREENS === '1';
const shotsDir = join(dirname(fileURLToPath(import.meta.url)), 'screens');
if (SCREENS) mkdirSync(shotsDir, { recursive: true });

const results = [];
const consoleErrors = [];
let page;

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`  ✗ ${name}\n      ${e.message}`);
    if (SCREENS) await page?.screenshot({ path: join(shotsDir, `falha-${results.length}.png`) }).catch(() => {});
  }
}
const state = () => page.evaluate(() => {
  const s = window.__skyline.getState();
  return { page: s.page, mode: s.mode, selectedFloor: s.selectedFloor, selectedUnit: s.selectedUnit, exploded: s.exploded, explodeGap: s.explodeGap, timeOfDay: s.timeOfDay, layers: s.layers, uiHidden: s.uiHidden, helpOpen: s.helpOpen, tour: s.tour, garageLevel: s.garageLevel, garageView: s.garageView, apartmentView: s.apartmentView, apartmentRoom: s.apartmentRoom, activeView: s.activeView, quality: s.quality, orbitSpeed: s.orbitSpeed };
});
const cam = () => page.evaluate(() => window.__skylineGL.camera());
/** Espera a câmera atender o último pedido, terminar a transição e renderizar mais dois quadros. */
async function settle(ms = 60000) {
  await page.waitForFunction(() => {
    const g = window.__skylineGL;
    return g && g.rig.handled === window.__skyline.getState().camera.id && !g.rig.animating;
  }, null, { timeout: ms });
  await frames(2);
  return cam();
}
/** Espera n quadros novos (o WebGL por software é lento: não use tempos fixos). */
async function frames(n = 2) {
  const f0 = await page.evaluate(() => window.__skylineGL.info().frame);
  await page.waitForFunction((t) => window.__skylineGL.info().frame >= t, f0 + n, { timeout: 60000 });
}
async function shot(name) {
  if (SCREENS) await page.screenshot({ path: join(shotsDir, `${name}.png`), timeout: 180000 });
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function open(url, viewport = { width: 1440, height: 900 }) {
  page = await browser.newPage({ viewport });
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
}

console.log(`SKYLINE 40 — testes de ponta a ponta em ${BASE}`);

// ---------------------------------------------------------------- desktop
await open(`${BASE}?nohelp&quality=low&reduced`);

await test('página inicial: título, frase, botões e indicadores', async () => {
  await page.waitForSelector('h1');
  const h1 = await page.textContent('h1');
  assert(/SKYLINE\s*40/.test(h1), `título inesperado: ${h1}`);
  assert(await page.isVisible('text=Uma nova perspectiva de viver.'), 'frase de impacto ausente');
  assert(await page.isVisible('button:has-text("Explorar em 3D")'), 'botão Explorar em 3D ausente');
  assert(await page.isVisible('button:has-text("Conhecer o projeto")'), 'botão Conhecer o projeto ausente');
  const facts = await page.textContent('.hero__facts');
  assert(facts.includes('40') && /cobertura/i.test(facts) && /garagem/i.test(facts), 'indicadores ausentes');
});

await test('cena 3D carrega com WebGL e sai do indicador de carregamento', async () => {
  await page.waitForFunction(() => window.__skyline?.getState().ready, null, { timeout: 180000 });
  assert(await page.locator('canvas').count() === 1, 'canvas não encontrado');
  await page.waitForSelector('.loader', { state: 'detached', timeout: 20000 });
});

await test('os 40 pavimentos estão presentes no modelo', async () => {
  const s = await page.evaluate(() => window.__skylineGL.instances('structure-'));
  assert(s.total === 40, `esperado 40 módulos de pavimento, encontrado ${s.total}`);
  await page.waitForFunction(() => window.__skylineGL.instances('structure-').visible === 40, null, { timeout: 30000 });
  const g = await page.evaluate(() => window.__skylineGL.instances('glass-'));
  assert(g.total === 40, `pele de vidro em ${g.total} pavimentos`);
});

await test('"Conhecer o projeto" rola até as seções', async () => {
  await page.click('button:has-text("Conhecer o projeto")');
  const scrolled = await page.waitForFunction(() => window.scrollY > 300, null, { timeout: 15000 }).then(() => true, () => false);
  assert(scrolled, `não rolou (scrollY=${await page.evaluate(() => window.scrollY)})`);
  for (const id of ['conceito', 'fachadas', 'pavimentos', 'apartamentos', 'cobertura', 'garagem', 'areas-comuns', 'galeria', 'ficha', 'creditos']) {
    assert(await page.locator(`#${id}`).count() === 1, `seção #${id} ausente`);
  }
  await page.evaluate(() => document.getElementById('galeria').scrollIntoView());
  const ok = await page.waitForFunction(() => [...document.querySelectorAll('.gallery img')].filter((e) => e.complete && e.naturalWidth > 0).length === 6, null, { timeout: 30000 }).then(() => true, () => false);
  const loaded = await page.$$eval('.gallery img', (els) => els.filter((e) => e.complete && e.naturalWidth > 0).length);
  assert(ok, `galeria: ${loaded}/6 imagens carregadas`);
  await page.evaluate(() => window.scrollTo(0, 0));
});

await test('"Explorar em 3D" abre a área de exploração', async () => {
  await page.click('button:has-text("Explorar em 3D")');
  await page.waitForSelector('.dock');
  const s = await state();
  assert(s.page === 'explore', 'não entrou no modo exploração');
  for (const sel of ['.topbar', '.rail', '.info', '.dock']) assert(await page.isVisible(sel), `${sel} não visível`);
  await settle();
  await shot('01-exploracao');
});

await test('arrastar gira o edifício (órbita real)', async () => {
  const before = await settle();
  const box = await page.locator('canvas').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(cx + i * 30, cy + i * 2);
  await page.mouse.up();
  const after = await settle();
  const az = (c) => Math.atan2(c.position[0] - c.target[0], c.position[2] - c.target[2]);
  const delta = Math.abs(az(after) - az(before));
  assert(delta > 0.2, `azimute mudou só ${delta.toFixed(3)} rad`);
});

await test('giro de 360° completo mantém o edifício enquadrado', async () => {
  await page.evaluate(() => window.__skyline.getState().setView('overview'));
  await settle();
  const az = (c) => Math.atan2(c.position[0] - c.target[0], c.position[2] - c.target[2]);
  const start = az(await cam());
  let acc = 0;
  let prev = start;
  // gira em passos de ~45° até completar a volta
  for (let i = 0; i < 8; i++) {
    await page.evaluate(() => {
      const c = window.__skylineGL.camera();
      const s = window.__skyline.getState();
      const dx = c.position[0] - c.target[0];
      const dz = c.position[2] - c.target[2];
      const a = Math.atan2(dx, dz) + Math.PI / 4;
      const r = Math.hypot(dx, dz);
      s.flyTo({ position: [c.target[0] + Math.sin(a) * r, c.position[1], c.target[2] + Math.cos(a) * r], target: c.target }, 0.01);
    });
    const c = await settle();
    let d = az(c) - prev;
    if (d < -Math.PI) d += Math.PI * 2;
    if (d > Math.PI) d -= Math.PI * 2;
    acc += d;
    prev = az(c);
    const t = c.target;
    assert(Math.hypot(t[0], t[2]) < 80, 'alvo da câmera saiu da área do edifício');
  }
  assert(acc > Math.PI * 1.9, `volta incompleta: ${(acc * 180 / Math.PI).toFixed(0)}°`);
});

await test('botões de vista: superior, inferior, frontal, lateral, visão geral', async () => {
  const click = async (label) => { await page.click(`.dock button:has-text("${label}")`); return settle(); };
  let c = await click('Superior');
  assert(c.position[1] > 200 && Math.hypot(c.position[0] - c.target[0], c.position[2] - c.target[2]) < 30, 'vista superior incorreta');
  c = await click('Inferior');
  assert(c.position[1] < 4 && c.target[1] > c.position[1] + 40, 'vista inferior não olha para cima');
  c = await click('Frontal');
  assert(Math.abs(c.position[0]) < 2 && c.position[2] > 150, 'vista frontal incorreta');
  c = await click('Lateral');
  assert(Math.abs(c.position[2]) < 2 && c.position[0] > 150, 'vista lateral incorreta');
  c = await click('Visão geral');
  const s = await state();
  assert(s.activeView === 'overview', 'visão geral não marcada');
});

await test('vista explodida: separa pavimentos, numeração, controle de distância e retorno', async () => {
  await page.click('.dock button:has-text("Explodida")');
  await page.waitForFunction(() => window.__skylineGL.runtime.explode > 0.99, null, { timeout: 30000 });
  const ys = await page.evaluate(() => [window.__skylineGL.runtime.y[1], window.__skylineGL.runtime.y[40]]);
  assert(ys[1] - ys[0] > 300, `pavimentos não se separaram (Δ=${(ys[1] - ys[0]).toFixed(1)})`);
  const tags = await page.locator('.floor-tag').count();
  assert(tags === 40, `numeração lateral com ${tags} rótulos`);
  assert(await page.locator('.floor-tag.is-common').count() >= 4, 'áreas comuns não identificadas');
  await page.locator('#gap').fill('12');
  await page.waitForFunction(() => window.__skyline.getState().explodeGap === 12);
  await frames(3);
  const ys2 = await page.evaluate(() => [window.__skylineGL.runtime.y[1], window.__skylineGL.runtime.y[40]]);
  assert(ys2[1] - ys2[0] > ys[1] - ys[0] + 100, 'controle de distância não alterou a separação');
  await page.locator('.floor-tag', { hasText: '17' }).first().click();
  let s = await state();
  assert(s.selectedFloor === 17, `rótulo não selecionou o pavimento (${s.selectedFloor})`);
  await settle();
  await shot('02-explodida');
  await page.click('.explode-ctl button:has-text("Juntar")');
  await page.waitForFunction(() => window.__skylineGL.runtime.explode < 0.01, null, { timeout: 30000 });
  s = await state();
  assert(!s.exploded, 'não voltou à estrutura original');
});

await test('menu de pavimentos seleciona cada um dos 40 andares', async () => {
  for (let n = 1; n <= 40; n++) {
    await page.locator(`.rail__item[data-floor="${n}"]`).click();
    const s = await state();
    assert(s.selectedFloor === n && s.mode === 'floor', `pavimento ${n} não selecionado`);
  }
  const info = await page.textContent('.info');
  assert(info.includes('Pavimento 40'), 'painel não mostra o pavimento selecionado');
});

await test('corte: pavimentos acima do selecionado saem e a câmera se aproxima', async () => {
  await page.locator('.rail__item[data-floor="20"]').click();
  await page.waitForFunction(() => window.__skylineGL.runtime.lift[21] > 0.99 && window.__skylineGL.runtime.lift[20] === 0, null, { timeout: 30000 });
  const c = await settle();
  assert(Math.abs(c.target[1] - 70.4) < 6, `câmera não mirou o pavimento 20 (alvo y=${c.target[1].toFixed(1)})`);
  await shot('03-pavimento');
});

await test('clique no modelo 3D seleciona andar e depois a unidade', async () => {
  await page.evaluate(() => window.__skyline.getState().selectFloor(null));
  await settle();
  const box = await page.locator('canvas').boundingBox();
  // centro da área livre entre os painéis
  const x = box.x + 92 + (box.width - 92 - 372) / 2;
  let hit = null;
  for (const dy of [0, -60, 60, -120, 120]) {
    await page.mouse.click(x, box.y + box.height / 2 + dy);
    await frames(2);
    hit = (await state()).selectedFloor;
    if (hit) break;
  }
  assert(hit, 'clique no edifício não selecionou pavimento');
  const floor = hit;
  if (floor >= 4 && floor <= 39) {
    await page.click('.unit--C');
    let s = await state();
    assert(s.selectedUnit === 'C', 'unidade não selecionada pelo painel');
    await page.waitForSelector('text=Entrar no apartamento decorado');
    await settle();
  }
});

await test('apartamento decorado: perspectiva, planta e interior navegável', async () => {
  await page.click('.modes button:has-text("Apartamento")');
  await page.waitForFunction(() => window.__skylineGL.count('apartment-demo') === 1, null, { timeout: 30000 });
  let s = await state();
  assert(s.mode === 'apartment' && s.selectedUnit, 'modo apartamento não ativado');
  await settle();
  await shot('04-apartamento');
  assert(await page.locator('.room-tag').count() >= 6, 'ambientes não identificados no 3D');
  await page.click('.segmented button:has-text("Planta superior")');
  let c = await settle();
  assert(c.position[1] - c.target[1] > 20 && Math.hypot(c.position[0] - c.target[0], c.position[2] - c.target[2]) < 2, 'planta superior não é vista de cima');
  assert(await page.locator('.info .plan svg').count() === 1, 'planta 2D ausente no painel');
  await page.click('.chips button:has-text("Suíte master")');
  s = await state();
  assert(s.apartmentView === 'interior' && s.apartmentRoom === 'master', 'interior da suíte master não ativado');
  c = await settle();
  const floorY = await page.evaluate(() => window.__skylineGL.runtime.y[window.__skyline.getState().selectedFloor]);
  assert(Math.abs(c.position[1] - (floorY + 1.65)) < 0.3, 'câmera não está na altura dos olhos');
  await shot('05-interior');
  await page.click('.info button:has-text("Voltar ao pavimento")');
  s = await state();
  assert(s.mode === 'floor', 'não voltou ao pavimento');
});

await test('cobertura: câmera sobe, piscina modelada e percurso cinematográfico', async () => {
  await page.click('.modes button:has-text("Cobertura")');
  const c = await settle();
  assert(c.target[1] > 135, `câmera não subiu à cobertura (alvo y=${c.target[1].toFixed(1)})`);
  assert(await page.evaluate(() => window.__skylineGL.count('pool-water')) === 1, 'água da piscina ausente');
  for (const n of ['loungers', 'lounge', 'gourmet', 'garden', 'perimeter', 'crown']) {
    assert(await page.evaluate((x) => window.__skylineGL.count(x), n) === 1, `elemento da cobertura ausente: ${n}`);
  }
  await page.click('.spot-list button:has-text("Piscina panorâmica")');
  assert((await state()).mode === 'rooftop', 'saiu da cobertura');
  await settle();
  await shot('06-piscina');
  // com "reduzir movimento" o percurso vira um corte direto; aqui testamos o percurso completo
  await page.evaluate(() => window.__skyline.getState().setReducedMotion(false));
  await page.click('.info button:has-text("Apresentação cinematográfica")');
  const p = await page.evaluate(() => window.__skyline.getState().camera.path?.length ?? 0);
  assert(p > 3, 'percurso cinematográfico não iniciado');
  await page.waitForFunction(() => window.__skylineGL.rig.animating, null, { timeout: 30000 });
  await page.evaluate(() => window.__skyline.getState().setReducedMotion(true));
  await page.evaluate(() => window.__skyline.getState().openRooftop('overview'));
});

await test('garagem: G1/G2, vistas superior, perspectiva e nível do piso', async () => {
  await page.click('.modes button:has-text("Garagem")');
  await page.waitForFunction(() => window.__skylineGL.count('garage') === 1, null, { timeout: 60000 });
  let c = await settle();
  assert(c.target[1] < 0, 'câmera não desceu ao subsolo');
  await page.waitForFunction(() => window.__skylineGL.runtime.lift[1] > 0.99, null, { timeout: 30000 });
  await shot('07-garagem');
  assert(await page.evaluate(() => window.__skylineGL.count('garage-G1')) === 1, 'nível G1 ausente');
  await page.click('.info .segmented button:has-text("G2")');
  let s = await state();
  assert(s.garageLevel === 1, 'G2 não selecionado');
  await page.waitForFunction(() => window.__skylineGL.count('garage-G1') === 0 && window.__skylineGL.count('garage-G2') === 1, null, { timeout: 30000 });
  await page.click('.info .segmented button:has-text("Superior")');
  c = await settle();
  assert(c.position[1] - c.target[1] > 60, 'vista superior da garagem incorreta');
  await page.click('.info .segmented button:has-text("Nível do piso")');
  c = await settle();
  assert(Math.abs(c.position[1] - (-7.2 + 1.65)) < 0.3, `câmera não está no nível do piso (y=${c.position[1].toFixed(2)})`);
  await shot('08-garagem-piso');
  s = await state();
  assert(s.garageView === 'street', 'vista ao nível do piso não ativa');
});

await test('modo noturno, pôr do sol e camadas da cena', async () => {
  await page.click('.dock button:has-text("Visão geral")');
  await page.click('.dock button:has-text("Modo noturno")');
  await page.waitForFunction(() => window.__skylineGL.runtime.night > 0.95, null, { timeout: 30000 });
  assert((await state()).timeOfDay === 'night', 'noite não ativada');
  await settle();
  await shot('09-noite');
  await page.click('.dock__time button[title^="Pôr do sol"]');
  assert((await state()).timeOfDay === 'sunset', 'pôr do sol não ativado');
  await page.click('.dock__time button[title^="Dia"]');
  await page.click('.dock button:has-text("Camadas")');
  for (const [label, key] of [['Fachada', 'facade'], ['Modo técnico', 'technical'], ['Paisagismo', 'landscape'], ['Iluminação arquitetônica', 'archLights'], ['Entorno', 'context']]) {
    const before = (await state()).layers[key];
    await page.locator('.toggle', { hasText: label }).click();
    const after = (await state()).layers[key];
    assert(after === !before, `camada ${label} não alternou`);
    await page.locator('.toggle', { hasText: label }).click();
  }
  await page.locator('.toggle', { hasText: 'Fachada' }).click();
  await page.waitForFunction(() => window.__skylineGL.instances('glass-').visible === 0, null, { timeout: 30000 });
  await page.locator('.toggle', { hasText: 'Fachada' }).click();
  await page.click('.layers .segmented button:has-text("Equilibrada")');
  assert((await state()).quality === 'medium', 'qualidade não alterada');
  await page.click('.dock button:has-text("Camadas")');
});

await test('reiniciar câmera, ocultar interface, ajuda e tela cheia', async () => {
  await page.click('.dock button:has-text("Explodida")');
  await page.click('.dock button:has-text("Reiniciar câmera")');
  let s = await state();
  assert(!s.exploded && s.mode === 'overview' && s.activeView === 'overview', 'reinício incompleto');
  await page.click('button[aria-label="Ocultar interface"]');
  assert(!(await page.isVisible('.dock')), 'interface não foi ocultada');
  await page.click('button:has-text("Mostrar interface")');
  assert(await page.isVisible('.dock'), 'interface não voltou');
  await page.click('button[aria-label="Ajuda"]');
  await page.waitForSelector('#help-title');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#help-title', { state: 'detached' });
  await page.click('.dock button:has-text("Tela cheia")');
  await page.waitForTimeout(500);
  const fs = await page.evaluate(() => Boolean(document.fullscreenElement) || window.__skyline.getState().uiHidden);
  assert(fs, 'tela cheia sem efeito');
  await page.evaluate(() => (document.fullscreenElement ? document.exitFullscreen() : window.__skyline.getState().setUiHidden(false)));
});

await test('atalhos de teclado', async () => {
  await page.keyboard.press('e');
  assert((await state()).exploded, 'E não explodiu');
  await page.keyboard.press('e');
  await page.keyboard.press('n');
  assert((await state()).timeOfDay === 'sunset', 'N não alternou o horário');
  await page.keyboard.press('ArrowUp');
  assert((await state()).selectedFloor === 1, 'seta para cima não selecionou o pavimento 01');
  await page.keyboard.press('Escape');
  assert((await state()).mode === 'overview', 'Esc não voltou à visão geral');
  await page.keyboard.press('r');
});

await test('apresentação guiada: etapas, pausar, avançar, voltar e sair', async () => {
  await page.click('button:has-text("Apresentação guiada")');
  await page.waitForSelector('.tour');
  let s = await state();
  assert(s.tour.active && s.tour.step === 0, 'apresentação não iniciou');
  const caption = await page.textContent('.tour__text p');
  assert(caption.length > 20, 'legenda ausente');
  await page.click('button[aria-label="Pausar"]');
  assert((await state()).tour.paused, 'não pausou');
  await page.click('button[aria-label="Continuar"]');
  for (let i = 1; i < 9; i++) {
    await page.click('button[aria-label="Próxima etapa"]');
    await page.waitForFunction((n) => window.__skyline.getState().tour.step === n, i);
    await frames(2);
  }
  s = await state();
  assert(s.tour.step === 8, 'não chegou à última etapa');
  await page.click('button[aria-label="Etapa anterior"]');
  await page.waitForFunction(() => window.__skyline.getState().tour.step === 7);
  await page.waitForFunction(() => window.__skyline.getState().mode === 'garage', null, { timeout: 30000 });
  assert((await state()).mode === 'garage', 'etapa da garagem não executou suas ações');
  await page.click('.tour button:has-text("Sair")');
  assert(!(await state()).tour.active, 'não saiu da apresentação');
});

await test('aba inativa suspende a renderização', async () => {
  const frame = () => page.evaluate(() => window.__skylineGL.info().frame);
  const a = await frame();
  await page.waitForTimeout(1500);
  const b = await frame();
  assert(b > a, 'a cena não está renderizando com a aba visível');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(1200);
  const c = await frame();
  await page.waitForTimeout(1500);
  const d = await frame();
  assert(d === c, `continuou renderizando com a aba oculta (${c} → ${d})`);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
});

const desktopErrors = [...consoleErrors];
await page.close();

// ---------------------------------------------------------------- celular
await open(`${BASE}?nohelp&quality=low&reduced`, { width: 390, height: 844 });
await test('celular: controles de toque, painel recolhível e botões confortáveis', async () => {
  await page.waitForFunction(() => window.__skyline?.getState().ready, null, { timeout: 180000 });
  await page.click('button:has-text("Explorar em 3D")');
  await page.waitForSelector('.mobile-tabs');
  const small = await page.$$eval('.dock__btn, .mobile-tabs button, .topbar .icon-btn', (els) => els.filter((e) => {
    const r = e.getBoundingClientRect();
    return r.width > 0 && (r.height < 40 || r.width < 40);
  }).length);
  assert(small === 0, `${small} botões menores que 40 px`);
  await page.click('.mobile-tabs button:has-text("Pavimentos")');
  await page.waitForSelector('.sheet .rail');
  await page.locator('.sheet .rail__item[data-floor="15"]').click();
  const s = await state();
  assert(s.selectedFloor === 15, 'seleção pelo painel do celular falhou');
  const inset = await page.evaluate(() => window.__skyline.getState().insets.bottom);
  assert(inset > 100, 'câmera não considera o painel inferior');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!overflow, 'rolagem horizontal na tela do celular');
  await shot('10-celular');
});
const mobileErrors = consoleErrors.slice(desktopErrors.length);
await page.close();

// ---------------------------------------------------------------- sem WebGL
const before = consoleErrors.length;
await open(`${BASE}?no3d&nohelp`);
await test('sem WebGL: experiência alternativa funcional', async () => {
  await page.waitForSelector('.fallback');
  assert(await page.locator('canvas').count() === 0, 'tentou criar o canvas');
  assert(!(await page.isVisible('button:has-text("Explorar em 3D")')), 'botão 3D não deveria aparecer');
  await page.locator('.fallback .elev__floor[aria-label^="Pavimento 03"]').click();
  assert((await page.textContent('.fallback__panel')).includes('Pavimento 03'), 'seleção no corte não funcionou');
  await page.locator('.fallback .elev__garage[aria-label="Garagem G2"]').click();
  assert((await page.textContent('.fallback__panel')).includes('G2'), 'garagem não exibida');
  await page.locator('.fallback .elev__roof').click();
  assert((await page.textContent('.fallback__panel')).includes('Piscina'), 'cobertura não exibida');
  await shot('11-sem-3d');
});
const fallbackErrors = consoleErrors.slice(before);
await page.close();

await test('nenhum erro no console', async () => {
  const all = [...desktopErrors, ...mobileErrors, ...fallbackErrors];
  assert(all.length === 0, `erros:\n      ${all.slice(0, 8).join('\n      ')}`);
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} testes passaram.`);
process.exit(failed.length ? 1 : 0);
