import { h, slot, clear } from '../dom.js';
import { CONFIG } from '../config.js';

function money(value, currency) {
  if (value == null || value === '') return 'Sob consulta';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
}

/** Serviços: lista editorial numerada (label + summary + link p/ preços). */
export function renderServices(pricing) {
  const root = clear(slot('services'));
  if (!root) return;
  if (!pricing.services.length) { root.append(h('li', { class: 'service-list__empty' }, 'Serviços em atualização.')); return; }
  pricing.services.forEach((s, i) => root.append(h('li', { class: 'service-list__item', 'data-reveal': true },
    h('span', { class: 'service-list__num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
    h('h3', { class: 'service-list__title' }, s.label),
    s.summary ? h('p', { class: 'service-list__summary' }, s.summary) : null,
    h('a', { class: 'service-list__link', href: `#preco-${s.id}` }, 'Ver investimento'))));
}

/** Investimento: por serviço, tabela-lista de faixas (tier) + adicionais. */
export function renderPricing(pricing) {
  const root = clear(slot('pricing'));
  const disc = slot('pricing-disclaimer');
  const terms = clear(slot('pricing-terms'));
  if (disc) disc.textContent = pricing.disclaimer;
  if (!root) return;
  const cur = pricing.currency;
  for (const s of pricing.services) {
    root.append(h('section', { class: 'price-group', id: `preco-${s.id}`, 'aria-labelledby': `preco-${s.id}-t`, 'data-reveal': true },
      h('h3', { class: 'price-group__title', id: `preco-${s.id}-t` }, s.label),
      h('ul', { class: 'tiers' }, s.tiers.map((t) => h('li', { class: `tier${t.highlight ? ' tier--highlight' : ''}` },
        t.highlight ? h('p', { class: 'tier__flag' }, 'Mais escolhido') : null,
        h('h4', { class: 'tier__name' }, t.name),
        h('p', { class: 'tier__price' }, h('span', { class: 'tier__from' }, 'a partir de '), h('strong', {}, money(t.price_from, cur)),
          t.unit ? h('span', { class: 'tier__unit' }, ` ${t.unit}`) : null),
        t.includes?.length ? h('ul', { class: 'tier__includes' }, t.includes.map((x) => h('li', {}, x))) : null,
        t.delivery ? h('p', { class: 'tier__delivery' }, `Entrega: ${t.delivery}`) : null,
        h('a', { class: 'tier__cta btn btn--ghost', href: '#contato', dataset: { service: s.id, tier: t.name } }, 'Solicitar orçamento')))),
      s.addons.length ? h('div', { class: 'addons' },
        h('h4', { class: 'addons__title' }, 'Adicionais'),
        h('ul', { class: 'addons__list' }, s.addons.map((a) => h('li', { class: 'addons__item' },
          h('span', {}, a.label), h('span', { class: 'addons__price' }, `${money(a.price_from, cur)}${a.unit ? ` ${a.unit}` : ''}`))))) : null));
  }
  if (terms) pricing.terms.forEach((t) => terms.append(h('li', {}, t)));
}
