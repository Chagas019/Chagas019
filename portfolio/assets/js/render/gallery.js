import { h, slot, clear } from '../dom.js';
import { picture, stillOf, shapeOf } from './media.js';
import { CONFIG } from '../config.js';

/**
 * Mosaico assimétrico: todas as mídias dos projetos filtrados.
 * Cada tile recebe --shape (panorama/landscape/portrait/square) e um ritmo (tile--a..d)
 * para que o CSS varie spans sem repetir uma grade uniforme.
 */
export function renderGallery({ projects }, filter, onOpen) {
  const root = clear(slot('gallery'));
  if (!root) return;
  const rhythm = ['a', 'b', 'c', 'd', 'b', 'a', 'd', 'c'];
  let n = 0;
  for (const p of projects.filter((x) => filter === 'all' || x.category === filter)) {
    p.media.forEach((m, idx) => {
      const still = stillOf(m);
      const shape = shapeOf(m.w || still?.w, m.h || still?.h);
      root.append(h('li', { class: `mosaic__tile mosaic__tile--${shape} mosaic__tile--${rhythm[n++ % rhythm.length]}`, 'data-reveal': true },
        h('button', {
          class: 'mosaic__btn', type: 'button',
          'aria-label': `${m.type === 'video' ? 'Assistir vídeo' : 'Ampliar imagem'}: ${m.alt || p.title}`,
          onclick: (e) => onOpen(p, idx, e.currentTarget),
        },
          picture({ ...still, alt: m.alt || '' }, { sizes: CONFIG.sizes.mosaic }),
          m.type === 'video' ? h('span', { class: 'badge badge--play', 'aria-hidden': 'true' }, '▶') : null,
          h('span', { class: 'mosaic__caption' }, p.title))));
    });
  }
  if (!n) root.append(h('li', { class: 'mosaic__empty' }, 'Sem mídias publicadas para este filtro.'));
}

/** Mídia de fundo do hero: capa do projeto em destaque (imagem, eager). */
export function renderHero({ projects }) {
  const root = clear(slot('hero-media'));
  if (!root) return;
  const p = projects.find((x) => x.featured) || projects[0];
  if (!p) return;
  const still = stillOf(p.cover || p.media[0]);
  root.append(picture({ ...still, alt: '' }, { sizes: CONFIG.sizes.hero, eager: true, className: 'hero__img' }));
}
