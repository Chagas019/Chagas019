import { h, slot, clear, item } from '../dom.js';
import { picture, stillOf } from './media.js';
import { CONFIG } from '../config.js';

/** Rótulos dos tipos (ordem = ordem dos filtros). */
export const TYPE_LABELS = { realizado: 'Realizado', pessoal: 'Pessoal', conceitual: 'Conceitual' };
const TYPE_HINT = {
  realizado: 'Projeto realizado',
  pessoal: 'Projeto pessoal / autoral',
  conceitual: 'Projeto conceitual (ainda não lançado)',
};

const badge = (type) => h('span', { class: `type-badge type-badge--${type}`, dataset: { typeBadge: type }, title: TYPE_HINT[type] }, TYPE_LABELS[type] || type);
const statusTag = (status) => (status ? h('span', { class: 'status-tag' }, status) : null);

/** Ficha textual usada no diálogo de detalhe (lightbox em modo texto). */
export function selectedDetail(p) {
  return h('div', { class: 'project-detail' },
    h('p', { class: 'project-detail__meta' }, badge(p.type), statusTag(p.status), p.year ? h('span', { class: 'project-detail__year' }, String(p.year)) : null),
    p.slogan ? h('p', { class: 'project-detail__slogan' }, `“${p.slogan}”`) : null,
    p.summary ? h('p', { class: 'project-detail__summary' }, p.summary) : null,
    p.role ? h('dl', { class: 'meta-list' }, h('dt', {}, 'Atuação'), h('dd', {}, p.role)) : null,
    p.type === 'conceitual' ? h('p', { class: 'project-detail__note' }, 'Projeto conceitual: proposta em desenvolvimento, sem lançamento público até o momento.') : null,
    p.links.length ? h('ul', { class: 'project-detail__links' }, p.links.map((l) => h('li', {},
      h('a', { href: l.url, target: '_blank', rel: 'noopener' }, l.label || l.url)))) : null,
    h('a', { class: 'project-detail__cta', href: '#orcamento', 'data-close': true }, 'Conversar sobre um projeto parecido'));
}

/** Filtros por tipo (aria-pressed) em [data-slot=selected-filters]. Só mostra tipos presentes. */
export function renderSelectedFilters({ selected }, onChange) {
  const root = clear(slot('selected-filters'));
  if (!root) return;
  const counts = Object.fromEntries(Object.keys(TYPE_LABELS).map((t) => [t, selected.filter((p) => p.type === t).length]));
  const mk = (id, label, count) => h('button', {
    class: 'filters__btn', type: 'button', 'aria-pressed': id === 'all' ? 'true' : 'false', dataset: { filter: id },
  }, label, h('span', { class: 'filters__count' }, count));
  root.append(mk('all', 'Todos', selected.length),
    ...Object.entries(TYPE_LABELS).filter(([t]) => counts[t]).map(([t, l]) => mk(t, l, counts[t])));
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn || !root.contains(btn)) return;
    root.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    onChange(btn.dataset.filter);
  });
}

/** Cards dos projetos selecionados. Clique → lightbox (mídia, se houver) + ficha textual. */
export function renderSelected({ selected }, filter, onOpen) {
  const root = clear(slot('selected-projects'));
  if (!root) return;
  const list = selected.filter((p) => filter === 'all' || p.type === filter);
  if (!list.length) { root.append(item(root, 'p', { class: 'selected__empty' }, 'Nenhum projeto neste filtro.')); return; }
  list.forEach((p, i) => {
    const cover = p.cover || p.media[0] || null;
    const tid = `sel-${p.id}-t`;
    root.append(item(root, 'article', {
      class: `selected-card selected-card--${p.type}${cover ? ' has-cover' : ''}`,
      'data-selected-project': p.id, 'data-type': p.type, 'data-reveal': true, 'aria-labelledby': tid,
    },
      cover
        ? h('div', { class: 'selected-card__media' }, picture({ ...stillOf(cover), alt: '' }, { sizes: CONFIG.sizes.index }))
        : h('div', { class: 'selected-card__frame', 'aria-hidden': 'true' }, // faixa baixa: sem capa, sem repetir o título
          h('span', { class: 'selected-card__frame-meta' }, `${String(i + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`),
          h('span', { class: 'selected-card__frame-note' }, 'Imagens em seleção')),
      h('p', { class: 'selected-card__meta' },
        h('span', { class: 'selected-card__num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
        badge(p.type), statusTag(p.status)),
      h('h3', { class: 'selected-card__title', id: tid }, p.title),
      p.role ? h('p', { class: 'selected-card__role' }, p.role) : null,
      p.slogan ? h('p', { class: 'selected-card__slogan' }, p.slogan) : null,
      p.summary ? h('p', { class: 'selected-card__summary' }, p.summary) : null,
      h('button', {
        class: 'selected-card__open', type: 'button', 'data-lightbox': true,
        'aria-label': `Ver detalhes: ${p.title}`, 'aria-haspopup': 'dialog',
        onclick: (e) => onOpen(p, 0, e.currentTarget, { detail: selectedDetail }),
      }, 'Ver detalhes')));
  });
}
