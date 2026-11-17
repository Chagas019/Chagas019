import { h, slot, clear } from '../dom.js';
import { CONFIG } from '../config.js';

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

/** Preços: grupos → itens ("a partir de"), aviso + nota. Cada item tem CTA que pré-marca o serviço no formulário. */
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
  for (const g of pricing.groups) {
    const tid = `preco-${g.id}-t`;
    root.append(h('section', { class: 'price-group', id: `preco-${g.id}`, 'aria-labelledby': tid, 'data-pricing-group': g.id, 'data-reveal': true },
      h('header', { class: 'price-group__head' },
        h('h3', { class: 'price-group__title', id: tid }, g.label),
        g.summary ? h('p', { class: 'price-group__summary' }, g.summary) : null),
      h('ul', { class: 'price-list' }, g.items.map((it) => {
        const pr = formatPrice(it.price_from, it.unit, cur);
        const consult = it.price_from == null || it.price_from === '';
        return h('li', { class: 'price-item', 'data-pricing-item': it.id },
          h('div', { class: 'price-item__head' },
            h('h4', { class: 'price-item__name' }, it.label),
            h('p', { class: 'price-item__price' },
              consult ? h('strong', { class: 'price-item__value' }, 'Sob consulta')
                : [h('span', { class: 'price-item__from' }, 'a partir de '), h('strong', { class: 'price-item__value' }, pr.value),
                  pr.unit ? h('span', { class: 'price-item__unit' }, ` ${pr.unit}`) : null])),
          it.desc ? h('p', { class: 'price-item__desc' }, it.desc) : null,
          h('a', { class: 'price-item__cta', href: '#orcamento', dataset: { service: `${g.label} — ${it.label}` },
            'aria-label': `Solicitar orçamento: ${it.label}` }, 'Solicitar orçamento'));
      }))));
  }
}
