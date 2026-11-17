import { h, slot, clear, item } from '../dom.js';
import { picture } from './media.js';
import { priceText } from './pricing.js';
import { waLink } from './contact.js';
import { CONFIG } from '../config.js';

export const productMessage = (p) => `Olá, Chagas! Tenho interesse no produto "${p.name}". Pode me passar mais informações sobre valor e disponibilidade?`;

/**
 * Produtos digitais: imagem (ou placeholder honesto), descrição, aplicação,
 * preço de pricing.products[id] ("a partir de R$ X" | "Sob consulta"), disponibilidade e
 * botão "Tenho interesse" → WhatsApp com mensagem pré-preenchida (sem links de compra).
 */
export function renderProducts({ products, site }, pricing) {
  const root = clear(slot('products'));
  if (!root) return;
  if (!products.length) { root.append(item(root, 'p', { class: 'products__empty' }, 'Produtos em preparação.')); return; }
  const prices = pricing?.products || {};
  const cur = pricing?.currency || 'BRL';
  products.forEach((p) => {
    const tid = `prod-${p.id}-t`;
    const img = p.image && (typeof p.image === 'string' ? { src: p.image } : p.image);
    const price = priceText(prices[p.id], cur);
    const href = site.whatsapp ? waLink(site.whatsapp, productMessage(p)) : (site.email ? `mailto:${site.email}?subject=${encodeURIComponent(`Interesse: ${p.name}`)}` : '#orcamento');
    root.append(item(root, 'article', { class: 'product-card', 'data-product': p.id, 'aria-labelledby': tid, 'data-reveal': true },
      h('div', { class: `product-card__media${img && img.src ? '' : ' is-empty'}` },
        img && img.src
          ? picture({ ...img, alt: img.alt || `Prévia: ${p.name}` }, { sizes: CONFIG.sizes.index })
          : h('div', { class: 'product-card__placeholder', role: 'img', 'aria-label': `${p.name}: imagem de prévia em produção` },
            h('span', { class: 'product-card__ph-note', 'aria-hidden': 'true' }, 'Prévia em produção'))),
      h('div', { class: 'product-card__body' },
        p.kind ? h('p', { class: 'product-card__kind' }, p.kind) : null,
        h('h3', { class: 'product-card__title', id: tid }, p.name),
        p.description ? h('p', { class: 'product-card__desc' }, p.description) : null,
        h('dl', { class: 'product-card__meta meta-list' },
          p.application ? [h('dt', {}, 'Aplicação'), h('dd', {}, p.application)] : null,
          h('dt', {}, 'Valor'), h('dd', { class: 'product-card__price' }, price),
          h('dt', {}, 'Disponibilidade'), h('dd', { class: 'product-card__availability' }, p.availability)),
        h('a', {
          class: 'product-card__cta btn btn--ghost btn--sm', href,
          ...(/^https:/.test(href) ? { target: '_blank', rel: 'noopener', 'aria-label': `Tenho interesse em ${p.name} (abre o WhatsApp em nova aba)` } : {}),
        }, 'Tenho interesse'))));
  });
}
