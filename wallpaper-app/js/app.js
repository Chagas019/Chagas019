import { buildCatalog, CATEGORIES, CATEGORY_BY_ID, filterByCategory, searchCatalog } from './catalog.js';
import { PHONE_ASPECT, renderToCanvas } from './art.js';
import { store } from './store.js';

const CATALOG = buildCatalog(24);
const BY_ID = new Map(CATALOG.map((i) => [i.id, i]));
const app = document.getElementById('app');
const toastEl = document.getElementById('toast');

/* ---------- Utilidades de DOM ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="square"><path d="M24 4v12M24 32v12M4 24h12M32 24h12M10 10l8 8M30 30l8 8M38 10l-8 8M18 30l-8 8"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 5l7 7-7 7"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20Z"/></svg>',
  heartFill: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-9.2-9A5 5 0 0 1 12 6a5 5 0 0 1 9.2 5C19 15.6 12 20 12 20Z"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15V4m-4 4 4-4 4 4M6 12v7h12v-7"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

function icon(name) {
  const t = document.createElement('template');
  t.innerHTML = ICONS[name]; // apenas constantes internas, nunca texto do usuário
  const svg = t.content.firstElementChild;
  svg.setAttribute('aria-hidden', 'true');
  return svg;
}

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
}

const fmtCount = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n));

/* ---------- Miniaturas: pintadas uma vez, guardadas como JPEG em memória ---------- */
const THUMB_W = 420;
const THUMB_H = Math.round(THUMB_W / PHONE_ASPECT);
const thumbCache = new Map();
const thumbQueue = [];
let scratch;
let pumping = false;

function thumbUrl(item) {
  if (thumbCache.has(item.id)) return thumbCache.get(item.id);
  const p = new Promise((resolve) => thumbQueue.push({ item, resolve }));
  thumbCache.set(item.id, p);
  pump();
  return p;
}

function pump() {
  if (pumping) return;
  pumping = true;
  const step = () => {
    const job = thumbQueue.shift();
    if (!job) { pumping = false; return; }
    scratch = renderToCanvas(job.item, THUMB_W, THUMB_H, scratch);
    scratch.toBlob((blob) => {
      job.resolve(blob ? URL.createObjectURL(blob) : scratch.toDataURL('image/jpeg', 0.85));
      requestAnimationFrame(step);
    }, 'image/jpeg', 0.86);
  };
  requestAnimationFrame(step);
}

const io = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        loadImg(e.target);
      }
    }, { rootMargin: '400px 0px' })
  : null;

function loadImg(img) {
  const item = BY_ID.get(img.dataset.id);
  if (!item) return;
  thumbUrl(item).then((url) => {
    img.src = url;
    img.decode?.().catch(() => {}).finally(() => img.classList.add('is-ready'));
    if (!img.decode) img.classList.add('is-ready');
  });
}

function lazyImg(item, cls = '') {
  const img = h('img', { class: cls, alt: '', 'data-id': item.id, draggable: 'false' });
  if (io) io.observe(img);
  else loadImg(img);
  return img;
}

/* ---------- Navegação ---------- */
let lastList = CATALOG; // lista em que o detalhe navega (anterior/próximo)
let cleanup = null;

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function parseRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', arg: parts[1] || '' };
}

function render() {
  cleanup?.();
  cleanup = null;
  const { name, arg } = parseRoute();
  if (!name && !store.isOnboarded()) return renderOnboarding();
  if (name === 'boas-vindas') return renderOnboarding();
  if (name === 'busca') return renderSearch(arg);
  if (name === 'w' && BY_ID.has(arg)) return renderDetail(BY_ID.get(arg));
  if (name === 'c' && (CATEGORY_BY_ID.has(arg) || arg === 'favoritos')) return renderHome(arg);
  return renderHome('all');
}

function mount(...nodes) {
  document.querySelector('.detail')?.remove();
  document.querySelector('.chips')?.remove();
  app.replaceChildren(...nodes);
}

/* ---------- Tela 1: boas-vindas ---------- */
function renderOnboarding() {
  const hero = { id: 'hero', category: 'portraits', seed: 1907, name: 'Aura', tags: [] };
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  const paint = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    if (r.width) renderToCanvas(hero, r.width * dpr, r.height * dpr, canvas);
  };
  const start = () => {
    store.setOnboarded();
    go('#/');
  };
  const screen = h('section', { class: 'onboard view-enter', 'aria-label': 'Boas-vindas' },
    canvas,
    h('div', { class: 'onboard__grid' }),
    h('div', { class: 'onboard__logo', role: 'img', 'aria-label': 'Aura' }, icon('logo')),
    h('div', { class: 'onboard__center' },
      h('span', { class: 'pill', text: 'Wallpaper' }),
      h('h1', { class: 'onboard__headline' }, 'Descubra wallpapers', h('br'), 'que deixam seu celular', h('br'), 'com a sua cara.')),
    h('div', { class: 'onboard__foot' },
      h('div', { class: 'onboard__meta' },
        h('span', {}, 'Sua tela.', h('br'), 'Seu estilo.'),
        h('span', { text: 'Escolha sua vibe' })),
      h('button', { class: 'btn-primary', type: 'button', onclick: start, 'data-testid': 'explore' }, 'Explorar wallpapers')));
  mount(screen);
  requestAnimationFrame(paint);
  let t;
  const onResize = () => { clearTimeout(t); t = setTimeout(paint, 150); };
  window.addEventListener('resize', onResize);
  cleanup = () => window.removeEventListener('resize', onResize);
}

/* ---------- Tela 2: início / categorias ---------- */
function header(title) {
  return h('header', { class: 'header' },
    h('h1', { text: title }),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Buscar wallpapers', onclick: () => go('#/busca') }, icon('search')));
}

function categoryCard(cat, cls) {
  const items = filterByCategory(CATALOG, cat.id).slice(0, 3);
  return h('button', { class: `card ${cls}`, type: 'button', 'aria-label': `${cat.title}: ver tudo`, onclick: () => go(`#/c/${cat.id}`) },
    h('span', { class: 'card__top' }, h('span', { text: 'Ver tudo' }), icon('arrow')),
    h('span', { class: 'card__peek', 'aria-hidden': 'true' }, items.map((i) => lazyImg(i))),
    h('h2', { class: 'card__title', text: cat.title }));
}

function bento() {
  const feat = CATEGORY_BY_ID.get('portraits');
  const featItem = filterByCategory(CATALOG, 'portraits')[3];
  const tileItem = filterByCategory(CATALOG, 'nature')[1];
  return h('div', { class: 'bento' },
    h('button', { class: 'card card--feat', type: 'button', 'aria-label': `${feat.title}: ver tudo`, onclick: () => go('#/c/portraits') },
      lazyImg(featItem),
      h('span', { class: 'card__top' }, h('span', {}, `${CATALOG.length}+`, h('br'), 'imagens'), icon('arrow')),
      h('h2', { class: 'card__title' }, feat.title)),
    categoryCard(CATEGORY_BY_ID.get('nature'), 'card--a'),
    categoryCard(CATEGORY_BY_ID.get('architecture'), 'card--b'),
    categoryCard(CATEGORY_BY_ID.get('cinematic'), 'card--c'),
    h('button', { class: 'card card--tile', type: 'button', 'aria-label': `Abrir ${tileItem.name}`, onclick: () => openDetail(tileItem, CATALOG) },
      lazyImg(tileItem)));
}

function thumb(item, list) {
  const fav = store.isFavorite(item.id);
  return h('button', { class: 'thumb', type: 'button', 'aria-label': `Abrir ${item.name}`, 'data-testid': 'thumb', onclick: () => openDetail(item, list) },
    lazyImg(item),
    h('span', { class: 'shimmer', 'aria-hidden': 'true' }),
    h('span', { class: 'thumb__name', text: item.name }),
    fav ? h('span', { class: 'thumb__fav', 'aria-label': 'Favorito' }, icon('heartFill')) : null);
}

function grid(list) {
  if (!list.length) return null;
  return h('div', { class: 'grid' }, list.map((i) => thumb(i, list)));
}

function chips(active) {
  const all = [{ id: 'all', name: 'Todos', count: CATALOG.length }, ...CATEGORIES.map((c) => ({ id: c.id, name: c.name })), { id: 'favoritos', name: 'Favoritos', count: store.favorites().length }];
  const bar = h('nav', { class: 'chips', 'aria-label': 'Categorias' },
    all.map((c) => h('button', {
      class: 'chip', type: 'button', 'aria-pressed': String(c.id === active), 'data-chip': c.id,
      onclick: () => go(c.id === 'all' ? '#/' : `#/c/${c.id}`),
    }, c.name, c.count != null && (c.id === 'all' || c.count > 0) ? h('span', { class: 'chip__badge', text: fmtCount(c.count) }) : null)));
  requestAnimationFrame(() => bar.querySelector('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' }));
  return bar;
}

function renderHome(active) {
  let content;
  if (active === 'all') {
    content = [bento(),
      h('div', { class: 'section-head' }, h('h2', { text: 'Em alta' }), h('span', { text: `${CATALOG.length} wallpapers` })),
      grid(CATALOG)];
  } else if (active === 'favoritos') {
    const favs = store.favorites().map((id) => BY_ID.get(id)).filter(Boolean);
    content = [
      h('div', { class: 'section-head' }, h('h2', { text: 'Favoritos' }), h('span', { text: `${favs.length} salvos` })),
      grid(favs) || h('div', { class: 'empty' }, h('strong', { text: 'Nenhum favorito ainda' }), 'Toque no coração de um wallpaper para guardá-lo aqui.')];
  } else {
    const cat = CATEGORY_BY_ID.get(active);
    const list = filterByCategory(CATALOG, active);
    content = [
      h('div', { class: 'section-head' }, h('h2', { text: cat.title }), h('span', { text: `${list.length} wallpapers` })),
      grid(list)];
  }
  mount(header('Wallpapers'), h('main', { class: 'main view-enter' }, content));
  document.body.append(chips(active));
  window.scrollTo(0, scrollMemory.get(location.hash) || 0);
  const onScroll = () => scrollMemory.set(location.hash, window.scrollY);
  window.addEventListener('scroll', onScroll, { passive: true });
  cleanup = () => window.removeEventListener('scroll', onScroll);
}
const scrollMemory = new Map();

/* ---------- Busca ---------- */
function renderSearch(initial) {
  const results = h('div');
  const input = h('input', {
    type: 'search', placeholder: 'Praia, arcos, retrato…', 'aria-label': 'Buscar wallpapers', enterkeyhint: 'search', autocomplete: 'off', maxlength: '60',
  });
  input.value = initial || '';
  const update = () => {
    const q = input.value.trim();
    history.replaceState(null, '', q ? `#/busca/${encodeURIComponent(q)}` : '#/busca');
    if (!q) {
      results.replaceChildren(
        h('p', { class: 'section-sub', text: 'Sugestões' }),
        h('div', { class: 'suggest' }, ['pôr do sol', 'arcos', 'retrato', 'cidade', 'pincelada', 'palmeira', 'estrada'].map((s) =>
          h('button', { class: 'chip', type: 'button', text: s, onclick: () => { input.value = s; update(); } }))));
      return;
    }
    const found = searchCatalog(CATALOG, q);
    results.replaceChildren(
      h('div', { class: 'section-head' }, h('h2', { text: 'Resultados' }), h('span', { text: `${found.length} encontrados` })),
      grid(found) || h('div', { class: 'empty' }, h('strong', { text: 'Nada encontrado' }), 'Tente outra palavra, como “praia” ou “abstrato”.'));
  };
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(update, 120); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') history.length > 1 ? history.back() : go('#/'); });
  mount(
    h('header', { class: 'header' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Voltar', onclick: () => go('#/') }, icon('back')),
      h('label', { class: 'search' }, icon('search'), input)),
    h('main', { class: 'main view-enter' }, results));
  update();
  input.focus();
}

/* ---------- Tela 3: detalhe ---------- */
function openDetail(item, list) {
  lastList = list && list.length ? list : CATALOG;
  location.hash = `#/w/${item.id}`;
}

function deviceSize() {
  const dpr = window.devicePixelRatio || 1;
  let w = Math.round(Math.min(window.screen.width, window.screen.height) * dpr);
  let hgt = Math.round(Math.max(window.screen.width, window.screen.height) * dpr);
  if (hgt / w < 1.6) { w = 1290; hgt = 2796; } // computador: usa um celular moderno como referência
  if (w < 1080) { hgt = Math.round((hgt * 1080) / w); w = 1080; } // nunca abaixo de Full HD
  return { w, h: hgt };
}

function clockParts() {
  const now = new Date();
  return {
    time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    date: now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function renderDetail(item) {
  const list = lastList.includes(item) ? lastList : CATALOG;
  const idx = list.indexOf(item);
  const cat = CATEGORY_BY_ID.get(item.category);
  const placeholder = lazyImg(item);
  placeholder.classList.add('is-ready');
  const canvas = h('canvas', { 'aria-hidden': 'true' });
  const { time, date } = clockParts();
  let lockOn = true;

  const favBtn = h('button', { class: 'icon-btn icon-btn--lg', type: 'button', 'aria-label': 'Favoritar', 'aria-pressed': String(store.isFavorite(item.id)), 'data-testid': 'fav' },
    icon(store.isFavorite(item.id) ? 'heartFill' : 'heart'));
  favBtn.addEventListener('click', () => {
    const on = store.toggleFavorite(item.id);
    favBtn.setAttribute('aria-pressed', String(on));
    favBtn.replaceChildren(icon(on ? 'heartFill' : 'heart'));
    toast(on ? 'Salvo nos favoritos' : 'Removido dos favoritos');
  });

  const lockBtn = h('button', { class: 'icon-btn icon-btn--ghost', type: 'button', 'aria-label': 'Ocultar prévia da tela de bloqueio', 'aria-pressed': 'true' }, icon('lock'));
  const nav = (d) => {
    const next = list[(idx + d + list.length) % list.length];
    history.replaceState(null, '', `#/w/${next.id}`);
    render();
  };
  const close = () => go(lastHome);

  const root = h('div', { class: 'detail view-enter', role: 'dialog', 'aria-modal': 'true', 'aria-label': item.name, 'data-lock': 'on' },
    h('div', { class: 'detail__stage' },
      placeholder,
      canvas,
      h('div', { class: 'lock', 'aria-hidden': 'true' },
        h('div', { class: 'lock__date', text: date }),
        h('div', { class: 'lock__time', text: time })),
      h('div', { class: 'detail__top' },
        h('button', { class: 'icon-btn icon-btn--ghost', type: 'button', 'aria-label': 'Fechar', onclick: close, 'data-testid': 'close' }, icon('back')),
        lockBtn),
      list.length > 1 ? h('button', { class: 'icon-btn icon-btn--ghost nav-arrow nav-arrow--prev', type: 'button', 'aria-label': 'Anterior', onclick: () => nav(-1) }, icon('back')) : null,
      list.length > 1 ? h('button', { class: 'icon-btn icon-btn--ghost nav-arrow nav-arrow--next', type: 'button', 'aria-label': 'Próximo', onclick: () => nav(1), 'data-testid': 'next' }, icon('next')) : null,
      h('div', { class: 'detail__bottom' },
        h('div', { class: 'detail__info' },
          h('div', {}, h('div', { class: 'detail__cat', text: cat.name }), h('h2', { class: 'detail__name', text: item.name })),
          h('span', { class: 'detail__count', text: `${idx + 1} / ${list.length}` })),
        h('div', { class: 'detail__actions' },
          favBtn,
          h('button', { class: 'btn-primary', type: 'button', onclick: () => openSheet(item), 'data-testid': 'download' }, icon('download'), 'Baixar'),
          h('button', { class: 'icon-btn icon-btn--lg', type: 'button', 'aria-label': 'Compartilhar', onclick: () => share(item) }, icon('share'))))));

  lockBtn.addEventListener('click', () => {
    lockOn = !lockOn;
    root.dataset.lock = lockOn ? 'on' : 'off';
    lockBtn.setAttribute('aria-pressed', String(lockOn));
    lockBtn.setAttribute('aria-label', lockOn ? 'Ocultar prévia da tela de bloqueio' : 'Mostrar prévia da tela de bloqueio');
  });

  // Gestos: deslizar para os lados troca de wallpaper.
  let sx = null, sy = 0;
  const stage = root.querySelector('.detail__stage');
  stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    sx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && list.length > 1) nav(dx < 0 ? 1 : -1);
  });
  const onKey = (e) => {
    if (document.querySelector('.sheet-backdrop')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') nav(1);
    else if (e.key === 'ArrowLeft') nav(-1);
  };
  document.addEventListener('keydown', onKey);

  document.querySelector('.chips')?.remove();
  document.querySelector('.detail')?.remove();
  if (!app.firstChild) renderHomeBehind();
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  root.querySelector('[data-testid="download"]').focus({ preventScroll: true });

  requestAnimationFrame(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const r = stage.getBoundingClientRect();
    renderToCanvas(item, r.width * dpr, r.height * dpr, canvas);
    canvas.classList.add('is-ready');
  });
  cleanup = () => {
    document.removeEventListener('keydown', onKey);
    root.remove();
    document.body.style.overflow = '';
  };
}

let lastHome = location.hash.startsWith('#/c/') ? location.hash : '#/';
window.addEventListener('hashchange', () => {
  const { name } = parseRoute();
  if (name !== 'w' && name !== 'busca' && name !== 'boas-vindas') lastHome = location.hash || '#/';
});
function renderHomeBehind() {
  const keep = cleanup;
  renderHome('all');
  document.querySelector('.chips')?.remove();
  cleanup?.();
  cleanup = keep;
}

/* ---------- Download e compartilhamento ---------- */
function renderBlob(item, w, hgt, type = 'image/png') {
  return new Promise((resolve, reject) => {
    const c = renderToCanvas(item, w, hgt);
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar a imagem'))), type, 0.95);
  });
}

function fileName(item, w, hgt) {
  return `aura-${item.id}-${w}x${hgt}.png`;
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function openSheet(item) {
  const dev = deviceSize();
  const options = [
    { label: 'Este aparelho', w: dev.w, h: dev.h },
    { label: 'Full HD', w: 1080, h: 2340 },
    { label: '4K', w: 2160, h: 4680 },
  ];
  const back = h('div', { class: 'sheet-backdrop', role: 'presentation' });
  const closeSheet = () => { back.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', onKey);
  back.addEventListener('click', (e) => { if (e.target === back) closeSheet(); });
  const sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Escolha a resolução' },
    h('div', { class: 'sheet__handle' }),
    h('h3', { text: 'Baixar wallpaper' }),
    options.map((o) => {
      const btn = h('button', { class: 'option', type: 'button', 'data-testid': 'res' },
        h('span', {}, h('b', { text: o.label }), h('small', { text: `${o.w} × ${o.h} px · PNG` })),
        icon('download'));
      btn.addEventListener('click', async () => {
        sheet.querySelectorAll('.option').forEach((b) => (b.disabled = true));
        btn.querySelector('small').textContent = 'Gerando em alta resolução…';
        await new Promise((r) => setTimeout(r, 30));
        try {
          const blob = await renderBlob(item, o.w, o.h);
          saveBlob(blob, fileName(item, o.w, o.h));
          toast('Download iniciado');
        } catch {
          toast('Não foi possível gerar a imagem');
        }
        closeSheet();
      });
      return btn;
    }));
  back.append(sheet);
  document.body.append(back);
  sheet.querySelector('button').focus();
}

async function share(item) {
  const link = `${location.origin}${location.pathname}#/w/${item.id}`;
  try {
    if (navigator.canShare) {
      const { w, h: hgt } = deviceSize();
      const blob = await renderBlob(item, Math.min(w, 1290), Math.min(hgt, 2796));
      const file = new File([blob], fileName(item, w, hgt), { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: item.name, text: `${item.name} — Aura Wallpapers` });
        return;
      }
    }
    if (navigator.share) {
      await navigator.share({ title: item.name, url: link });
      return;
    }
    await navigator.clipboard.writeText(link);
    toast('Link copiado');
  } catch (e) {
    if (e?.name !== 'AbortError') toast('Compartilhamento indisponível neste navegador');
  }
}

/* ---------- Início ---------- */
window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Exposto para os testes automatizados.
window.__aura = { count: CATALOG.length };
