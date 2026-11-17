import { h, slot, clear } from '../dom.js';

/** Áreas de atuação: 5 blocos numerados com lista de serviços. */
export function renderAreas({ areas }) {
  const root = clear(slot('areas'));
  if (!root) return;
  if (!areas.length) { root.append(h('p', { class: 'areas__empty' }, 'Áreas de atuação em atualização.')); return; }
  areas.forEach((a, i) => {
    const tid = `area-${a.id}-t`;
    root.append(h('article', { class: 'area', id: `area-${a.id}`, 'aria-labelledby': tid, dataset: { area: a.id }, 'data-reveal': true },
      h('span', { class: 'area__num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
      h('h3', { class: 'area__title', id: tid }, a.label),
      a.intro ? h('p', { class: 'area__intro' }, a.intro) : null,
      a.items.length ? h('ul', { class: 'area__list' }, a.items.map((x) => h('li', { class: 'area__item' }, x))) : null));
  });
}

/** Ferramentas: mapa de uso (onde cada uma entra), sem nível de domínio. */
export function renderTools({ tools }) {
  const root = clear(slot('tools'));
  if (!root) return;
  tools.forEach((t) => root.append(h('li', { class: 'tool', 'data-reveal': true },
    h('h3', { class: 'tool__name' }, t.name),
    t.uses.length ? h('ul', { class: 'tool__uses', 'aria-label': `Usos de ${t.name}` }, t.uses.map((u) => h('li', { class: 'tool__use' }, u))) : null,
    t.context ? h('p', { class: 'tool__context' }, t.context) : null)));
}

/** Equipamentos já utilizados ou explorados (nunca "disponíveis"). */
export function renderEquipment({ equipment }) {
  const root = clear(slot('equipment'));
  if (!root) return;
  root.append(h('p', { class: 'equipment__note', role: 'note' }, equipment.note),
    h('ul', { class: 'equipment__list' }, equipment.items.map((e) => h('li', { class: 'equipment__item', dataset: e.kind ? { kind: e.kind } : {} },
      h('span', { class: 'equipment__name' }, e.name),
      e.kind ? h('span', { class: 'equipment__kind' }, e.kind) : null))));
}

/** Conhecimentos (lista simples de tags). */
export function renderKnowledge({ equipment }) {
  const root = clear(slot('knowledge'));
  if (!root) return;
  equipment.knowledge.forEach((k) => root.append(h('li', { class: 'knowledge__item' }, k)));
}
