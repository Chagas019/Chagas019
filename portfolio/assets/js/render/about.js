import { h, slot, clear, item } from '../dom.js';
import { picture } from './media.js';

/** Iniciais para o monograma (CHAGAS CREATIVE → "CC"). */
export const initials = (name = '') => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '·';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
};

/** Sobre: parágrafos + foto (sem foto → monograma "CC" com aviso honesto "foto a confirmar"). */
export function renderAbout({ site, about }) {
  const root = slot('about');
  if (root) {
    clear(root);
    const paras = about.paragraphs.length ? about.paragraphs : ['Apresentação em atualização.'];
    paras.forEach((t, i) => root.append(h('p', { class: `about__p${i === 0 ? ' about__p--lead' : ''}` }, t)));
    if (about.quote) root.append(h('blockquote', { class: 'about__quote' }, h('p', {}, about.quote)));
  }
  const ph = clear(slot('about-photo'));
  if (!ph) return;
  const photo = about.photo;
  const who = site.fullName || site.name || 'Chagas';
  if (photo && (typeof photo === 'string' || photo.src)) {
    const img = typeof photo === 'string' ? { src: photo } : photo;
    ph.classList.remove('is-monogram');
    ph.append(picture({ ...img, alt: img.alt || `Retrato de ${who}` }, { sizes: '(min-width: 900px) 40vw, 90vw', className: 'about__photo' }));
    return;
  }
  const mono = initials(site.brand || 'Chagas Creative');
  ph.classList.add('is-monogram');
  ph.append(
    h('div', { class: 'monogram', role: 'img', 'aria-label': `Monograma ${mono}. Foto de ${who} a confirmar.` },
      h('span', { class: 'monogram__letter', 'aria-hidden': 'true' }, mono)),
    h('p', { class: 'monogram__note', 'aria-hidden': 'true' }, 'foto a confirmar'));
}

/** Linha do tempo: só fatos do conteúdo (period, title, text). Vazia → slot oculto. */
export function renderTimeline({ timeline }) {
  const root = clear(slot('timeline'));
  if (!root) return;
  root.hidden = !timeline.length;
  timeline.forEach((t) => root.append(item(root, 'div', { class: 'timeline__item', 'data-reveal': true },
    t.period ? h('span', { class: 'timeline__period' }, t.period) : null,
    t.title ? h('h3', { class: 'timeline__title' }, t.title) : null,
    t.text ? h('p', { class: 'timeline__text' }, t.text) : null)));
}
