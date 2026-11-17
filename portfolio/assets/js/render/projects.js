import { h, slot, clear } from '../dom.js';
import { picture, stillOf, shapeOf } from './media.js';
import { CONFIG } from '../config.js';

const catLabel = (cats, id) => cats.find((c) => c.id === id)?.label || id || '';

/** Botões de filtro (aria-pressed). onChange(categoryId|'all'). */
export function renderFilters({ categories, projects }, onChange) {
  const root = clear(slot('filters'));
  if (!root) return;
  const counts = Object.fromEntries(categories.map((c) => [c.id, projects.filter((p) => p.category === c.id).length]));
  const mk = (id, label, count) => h('button', {
    class: 'filters__btn', type: 'button', 'aria-pressed': id === 'all' ? 'true' : 'false', dataset: { filter: id },
  }, label, h('span', { class: 'filters__count' }, count));
  root.append(mk('all', 'Todos', projects.length), ...categories.map((c) => mk(c.id, c.label, counts[c.id])));
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    root.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    onChange(btn.dataset.filter);
  });
}

/** Projeto em destaque: mídia grande + ficha. */
export function renderFeatured({ projects, categories }, filter, onOpen) {
  const root = clear(slot('featured'));
  if (!root) return;
  const pool = projects.filter((p) => filter === 'all' || p.category === filter);
  const p = pool.find((x) => x.featured) || pool[0];
  if (!p) return;
  const still = stillOf(p.cover || p.media[0]);
  const shape = shapeOf(still?.w, still?.h);
  root.append(h('article', { class: `featured__item featured__item--${shape}`, 'data-reveal': true },
    h('button', { class: 'featured__media', type: 'button', 'aria-label': `Abrir galeria: ${p.title}`, onclick: (e) => onOpen(p, 0, e.currentTarget) },
      picture(still, { sizes: CONFIG.sizes.featured }),
      p.media.some((m) => m.type === 'video') ? h('span', { class: 'badge badge--video' }, 'Vídeo') : null),
    h('div', { class: 'featured__meta' },
      h('p', { class: 'eyebrow' }, [catLabel(categories, p.category), p.year].filter(Boolean).join(' · ')),
      h('h3', { class: 'featured__title' }, p.title),
      p.description ? h('p', { class: 'featured__desc' }, p.description) : null,
      h('dl', { class: 'meta-list' },
        p.client ? [h('dt', {}, 'Cliente'), h('dd', {}, p.client)] : null,
        p.role ? [h('dt', {}, 'Função'), h('dd', {}, p.role)] : null,
        h('dt', {}, 'Mídias'), h('dd', {}, String(p.media.length))))));
}

/** Índice editorial: lista numerada (nº, título, categoria, ano) com preview no hover/foco. */
export function renderIndex({ projects, categories }, filter, onOpen) {
  const root = clear(slot('project-index'));
  if (!root) return;
  const list = projects.filter((p) => filter === 'all' || p.category === filter);
  if (!list.length) {
    root.append(h('li', { class: 'project-index__empty' }, 'Nenhum projeto publicado nesta categoria ainda.'));
    return;
  }
  list.forEach((p, i) => {
    const still = stillOf(p.cover || p.media[0]);
    root.append(h('li', { class: 'project-index__item', dataset: { category: p.category }, 'data-reveal': true },
      h('button', { class: 'project-index__link', type: 'button', onclick: (e) => onOpen(p, 0, e.currentTarget) },
        h('span', { class: 'project-index__num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
        h('span', { class: 'project-index__title' }, p.title),
        h('span', { class: 'project-index__cat' }, catLabel(categories, p.category)),
        h('span', { class: 'project-index__year' }, p.year || ''),
        h('span', { class: 'project-index__thumb', 'aria-hidden': 'true' }, picture({ ...still, alt: '' }, { sizes: CONFIG.sizes.index })))));
  });
}

/** Categorias sem projeto publicado → bloco honesto "Em curadoria". */
export function renderCuration({ projects, categories, missing }, filter) {
  const root = clear(slot('curation'));
  if (!root) return;
  const empty = categories.filter((c) => !projects.some((p) => p.category === c.id));
  const shown = empty.filter((c) => filter === 'all' || c.id === filter);
  for (const c of shown) {
    const note = missing.find((m) => m.category === c.id)?.note;
    root.append(h('aside', { class: 'curation__block', 'aria-label': `${c.label}: em curadoria`, 'data-reveal': true },
      h('p', { class: 'curation__tag' }, 'Em curadoria'),
      h('h4', { class: 'curation__title' }, c.label),
      h('p', { class: 'curation__text' }, note || c.intro || 'Material desta categoria está sendo selecionado e será publicado em breve.'),
      h('a', { class: 'curation__cta', href: '#contato' }, 'Quer ver material desta área? Fale comigo')));
  }
}
