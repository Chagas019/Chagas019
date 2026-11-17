import { h, slot, clear } from '../dom.js';
import { CONFIG } from '../config.js';
import { disclosure, MQ_TABLET } from './disclosure.js';

function money(value, currency) {
  if (value == null || value === '') return 'Sob consulta';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(CONFIG.locale, {
    style: 'currency', currency, minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: n % 1 ? 2 : 0,
  }).format(n);
}

/**
 * Formata preço + unidade.
 *  "% do pacote" / "% da peça" → "+30% do pacote" (price_from é percentual)
 *  "km" / "segundo" / "hora" …  → "R$ 1,80 por km"
 *  unidade já com "por"/"/"     → mantida
 * Retorna { value, unit } para permitir marcação separada.
 */
export function formatPrice(value, unit, currency) {
  const u = (unit || '').trim();
  if (u.startsWith('%')) return { value: `+${new Intl.NumberFormat(CONFIG.locale).format(Number(value))}%`, unit: u.slice(1).trim(), percent: true };
  const unitText = !u ? '' : /^(por|\/)/i.test(u) ? u : `por ${u}`;
  return { value: money(value, currency), unit: unitText, percent: false };
}

/** Texto completo de preço "a partir de R$ X" ou "Sob consulta". */
export function priceText(value, currency = 'BRL', unit = null) {
  if (value == null || value === '') return 'Sob consulta';
  const pr = formatPrice(value, unit, currency);
  return `a partir de ${pr.value}${pr.unit ? ` ${pr.unit}` : ''}`;
}

/** Lista editorial de serviços (slot opcional "services"): um item por grupo de preço. */
export function renderServices(pricing) {
  const root = clear(slot('services'));
  if (!root) return;
  if (!pricing.groups.length) { root.append(h('li', { class: 'service-list__empty' }, 'Serviços em atualização.')); return; }
  pricing.groups.forEach((g, i) => root.append(h('li', { class: 'service-list__item', 'data-reveal': true },
    h('span', { class: 'service-list__num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
    h('h3', { class: 'service-list__title' }, g.label),
    g.summary ? h('p', { class: 'service-list__summary' }, g.summary) : null,
    h('a', { class: 'service-list__link', href: `#preco-${g.id}` }, 'Ver valores'))));
}

/** Área de atuação → grupo de preço (id igual ou 1º segmento: "design-motion" → "design"). */
function linkAreas(groups) {
  document.querySelectorAll('[data-area]').forEach((el) => {
    const id = el.dataset.area;
    const g = groups.find((x) => x.id === id || x.id === id.split('-')[0]);
    if (!g || el.querySelector('.area__price-link')) return;
    el.append(h('a', { class: 'area__price-link', href: `#preco-${g.id}`, 'aria-label': `Ver valores de ${g.label}` }, 'Ver valores', h('span', { 'aria-hidden': 'true' }, ' →')));
  });
}

/**
 * Preços: grupos → itens ("a partir de"), aviso + nota.
 * Grupo vira acordeão < 900px (só o 1º aberto); a linha inteira é o alvo "+" que leva ao formulário
 * com o serviço pré-marcado (a[data-service], ver form.js).
 */
export function renderPricing(pricing) {
  const disc = slot('pricing-disclaimer');
  const note = slot('pricing-note');
  if (disc && pricing.disclaimer) disc.textContent = pricing.disclaimer;
  if (note && pricing.note) note.textContent = pricing.note;
  const terms = clear(slot('pricing-terms'));
  if (terms) pricing.terms.forEach((t) => terms.append(h('li', {}, t)));
  const root = clear(slot('pricing'));
  if (!root) return;
  if (!pricing.groups.length) {
    root.append(h('p', { class: 'pricing__empty' }, 'Valores em atualização. Solicite um orçamento personalizado.'));
    return;
  }
  const cur = pricing.currency;
  const panels = {};
  pricing.groups.forEach((g, gi) => {
    const tid = `preco-${g.id}-t`;
    const title = h('h3', { class: 'pricing__group-title', id: tid }, g.label);
    const list = h('ul', { class: 'pricing__items', id: `preco-${g.id}-itens` }, g.items.map((it) => {
      const pr = formatPrice(it.price_from, it.unit, cur);
      const consult = it.price_from == null || it.price_from === '';
      return h('li', { class: 'pricing__item', 'data-pricing-item': it.id },
        h('div', { class: 'pricing__item-head' },
          h('h4', { class: 'pricing__item-name' }, it.label),
          h('p', { class: 'pricing__item-price' },
            consult ? h('strong', { class: 'pricing__item-value' }, 'Sob consulta')
              : [h('span', { class: 'pricing__item-from' }, 'a partir de '), h('strong', { class: 'pricing__item-value' }, pr.value),
                pr.unit ? h('span', { class: 'pricing__item-unit' }, ` ${pr.unit}`) : null])),
        it.desc ? h('p', { class: 'pricing__item-desc' }, it.desc) : null,
        h('a', { class: 'pricing__item-cta', href: '#quote-form', dataset: { service: `${g.label} — ${it.label}` },
          'aria-label': `Solicitar orçamento: ${it.label}`, title: 'Solicitar orçamento' },
        h('span', { class: 'pricing__item-cta-text' }, 'Orçar'), h('span', { class: 'pricing__item-cta-icon', 'aria-hidden': 'true' }, '+')));
    }));
    root.append(h('section', { class: 'pricing__group', id: `preco-${g.id}`, 'aria-labelledby': tid, 'data-pricing-group': g.id, 'data-reveal': true },
      h('header', { class: 'pricing__group-head' }, title, g.summary ? h('p', { class: 'pricing__group-summary' }, g.summary) : null),
      list));
    const n = g.items.length;
    panels[g.id] = disclosure(title, list, { mq: MQ_TABLET, open: gi === 0, meta: `${n} ${n === 1 ? 'item' : 'itens'}` });
  });
  // âncoras #preco-<grupo> (links "Ver valores", hash inicial) abrem o grupo fechado
  const openFor = (hash) => { const m = /^#preco-(.+)$/.exec(hash || ''); if (m && panels[m[1]]) panels[m[1]].open(); };
  openFor(window.location.hash);
  document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#preco-"]'); if (a) openFor(a.getAttribute('href')); });
  window.addEventListener('hashchange', () => openFor(window.location.hash));
  linkAreas(pricing.groups);
}
