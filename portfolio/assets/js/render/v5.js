/* v5: hero, destaques, habilidades, processo, citação. */
import { h, slot, clear } from '../dom.js';
import { picture, stillOf } from './media.js';

const ICONS = {
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM20 20l-4-4',
  pen: 'M4 20l4-1L19 8l-3-3L5 16l-1 4zM14 7l3 3',
  camera: 'M4 8h3l2-2h6l2 2h3v11H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a5 5 0 0 1-2.3-2.3l.8-1-1-2z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7zM17.5 6.5h.01',
  email: 'M3 6h18v12H3zM3 7l9 6 9-6',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 7a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z',
  arrow: 'M4 12h15M14 6l6 6-6 6',
};
const NS = 'http://www.w3.org/2000/svg';
export function icon(name) {
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
  s.setAttribute('class', `ico ico--${name}`);
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONS[name] || ''); s.append(p);
  return s;
}
const pad = (n) => String(n).padStart(2, '0');

export function renderHero({ site, about, projects }) {
  const intro = slot('hero-intro');
  if (intro && about.paragraphs[0]) intro.textContent = about.paragraphs[0];
  const n = slot('stat-works');
  if (n && projects.length) n.textContent = String(projects.length);
  const role = slot('hero-role');
  if (role && site.role) role.textContent = site.role;
  const photo = site.heroPhoto || about.photo;
  const ph = slot('hero-photo');
  if (!ph) return;
  const img = typeof photo === 'string' ? { src: photo } : photo;
  if (!img || !img.src) {
    const tpl = document.querySelector('template[data-hero-fallback]');
    ph.classList.remove('has-photo');
    clear(ph).append(tpl ? tpl.content.cloneNode(true) : '');
    return;
  }
  const el = ph.querySelector('img'), src = img.fallback || img.src; // HTML já traz a foto atual (LCP)
  if (!el || el.getAttribute('src') === src) return;
  ph.querySelectorAll('source').forEach((x) => x.setAttribute('srcset', [img.srcMobile && `${img.srcMobile} 640w`, `${img.src} ${img.w || 1150}w`].filter(Boolean).join(', ')));
  Object.entries({ src, alt: img.alt || site.fullName, width: img.w, height: img.h }).forEach(([k, v]) => v && el.setAttribute(k, v));
}

export function renderHighlights({ projects, categories, highlights }, onOpen) {
  const root = clear(slot('highlights'));
  if (!root) return;
  const byId = (id) => projects.find((p) => p.id === id);
  let list = highlights.map(byId).filter(Boolean);
  if (list.length < 3) list = [...list, ...projects.filter((p) => !list.includes(p))].slice(0, 3);
  const cat = (id) => (categories.find((c) => c.id === id) || {}).label || '';
  list.slice(0, 3).forEach((p, i) => {
    const tid = `hl-${p.id}-t`;
    const still = stillOf(p.cover || p.media[0]);
    root.append(h('li', { class: 'work-card', dataset: { highlight: p.id } },
      h('div', { class: 'work-card__media' }, picture({ ...still, alt: '' }, { sizes: '(min-width: 900px) 30vw, 90vw' })),
      h('div', { class: 'work-card__body' },
        h('span', { class: 'work-card__num', 'aria-hidden': 'true' }, pad(i + 1)),
        h('div', { class: 'work-card__text' },
          h('h3', { class: 'work-card__title', id: tid }, p.title),
          h('p', { class: 'work-card__type' }, [cat(p.category), p.role].filter(Boolean).join(' · '))),
        h('button', {
          class: 'work-card__open', type: 'button', 'data-lightbox': true, 'aria-haspopup': 'dialog',
          'aria-label': `Abrir galeria: ${p.title}`, onclick: (e) => onOpen(p, 0, e.currentTarget),
        }, icon('arrow')))));
  });
}

export function renderSkills({ skills, tools }) {
  const chips = (name, list) => {
    const root = clear(slot(name));
    if (root) list.forEach((t) => root.append(h('li', { class: 'skill-chip' }, t)));
  };
  chips('skills', skills);
  chips('tool-chips', tools.map((t) => t.name));
}

const STEP_ICONS = ['search', 'pen', 'camera', 'sliders', 'send'];
export function renderProcess({ process }) {
  const root = clear(slot('process'));
  if (!root) return;
  process.forEach((s, i) => root.append(h('li', { class: 'step' },
    h('span', { class: 'step__num', 'aria-hidden': 'true' }, pad(i + 1)),
    h('span', { class: 'step__icon' }, icon(STEP_ICONS[i % STEP_ICONS.length])),
    h('div', { class: 'step__text' }, h('h3', { class: 'step__title' }, s.title), s.text ? h('p', { class: 'step__desc' }, s.text) : null))));
}

export function renderQuote({ quote }) {
  if (!quote) return;
  const t = slot('quote-text'); if (t) t.textContent = quote.text;
  const s = slot('quote-sign'); if (s && quote.signature) s.textContent = quote.signature;
}
