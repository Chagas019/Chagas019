import { h, slot, clear } from '../dom.js';
import { picture, stillOf, shapeOf, selectionOverlay, ratioLabel } from './media.js';
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
      const W = m.w || still?.w; const H = m.h || still?.h;
      root.append(h('li', { class: `mosaic__tile artboard mosaic__tile--${shape} mosaic__tile--${rhythm[n++ % rhythm.length]}`, 'data-reveal': true },
        h('span', { class: 'artboard__label', 'aria-hidden': 'true' }, `${p.title} — ${ratioLabel(W, H)}`),
        h('button', {
          class: 'mosaic__btn', type: 'button', 'data-lightbox': true,
          'aria-label': `${m.type === 'video' ? 'Assistir vídeo' : 'Ampliar imagem'}: ${m.alt || p.title}`,
          onclick: (e) => onOpen(p, idx, e.currentTarget),
        },
          picture({ ...still, alt: m.alt || '' }, { sizes: CONFIG.sizes.mosaic }),
          m.type === 'video' ? h('span', { class: 'badge badge--play', 'aria-hidden': 'true' }, '▶') : null,
          h('span', { class: 'mosaic__caption' }, p.title),
          selectionOverlay(W, H))));
    });
  }
  if (!n) root.append(h('li', { class: 'mosaic__empty' }, 'Sem mídias publicadas para este filtro.'));
}
