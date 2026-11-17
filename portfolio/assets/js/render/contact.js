import { h, slot, clear } from '../dom.js';
import { icon } from './v5.js';

export const waLink = (num, text = '') => (num ? `https://wa.me/${String(num).replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '');
export const igLink = (user) => (user ? `https://www.instagram.com/${String(user).replace(/^@/, '')}/` : '');
export const mailLink = (email, subject = '', body = '') => {
  if (!email) return '';
  const q = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean).join('&');
  return `mailto:${email}${q ? `?${q}` : ''}`;
};
const isPh = (v) => /^\s*a confirmar/i.test(String(v || ''));

/** Preenche [data-bind="site.x"] com textContent. */
export function bindSite(site) {
  document.querySelectorAll('[data-bind^="site."]').forEach((node) => {
    const v = site[node.dataset.bind.slice(5)];
    if (!v) return;
    const ph = isPh(v);
    node.textContent = ph ? 'A confirmar' : String(v);
    node.classList.toggle('is-placeholder', ph);
  });
  const y = slot('year'); if (y) y.textContent = String(new Date().getFullYear());
}

/** Canais oficiais: WhatsApp, Instagram, e-mail (ordem do briefing). */
export function contactChannels(site) {
  const ig = site.instagramUrl || igLink(site.instagram);
  return [
    site.whatsapp && { id: 'whatsapp', label: 'WhatsApp', value: site.whatsappDisplay || `+${site.whatsapp}`, href: waLink(site.whatsapp), ext: true },
    ig && { id: 'instagram', label: 'Instagram', value: site.instagram ? `@${site.instagram}` : 'Instagram', href: ig, ext: true },
    site.email && { id: 'email', label: 'E-mail', value: site.email, href: mailLink(site.email) },
  ].filter(Boolean);
}

export function renderContactLinks(site) {
  const items = contactChannels(site);
  for (const name of ['contact-links', 'footer-links']) {
    const root = clear(slot(name));
    if (!root) continue;
    if (!items.length) {
      root.append(h('li', { class: 'contact-link contact-link--pending' }, h('a', { href: '#orcamento' }, 'Canais diretos a confirmar — use o formulário de orçamento')));
      continue;
    }
    items.forEach((it) => root.append(h('li', { class: `contact-link contact-link--${it.id}`, dataset: { channel: it.id } },
      h('a', {
        href: it.href,
        ...(it.ext ? { target: '_blank', rel: 'noopener', 'aria-label': `${it.label}: ${it.value} (abre em nova aba)` } : {}),
      },
        h('span', { class: 'contact-link__icon' }, icon(it.id)),
        h('span', { class: 'contact-link__label' }, it.label), ' ', h('span', { class: 'contact-link__value' }, it.value)))));
    if (name === 'contact-links' && site.location) root.append(h('li', { class: 'contact-link contact-link--location' },
      h('span', { class: 'contact-link__row' }, h('span', { class: 'contact-link__icon' }, icon('pin')),
        h('span', { class: 'contact-link__label' }, 'Local'), ' ', h('span', { class: 'contact-link__value' }, site.location))));
  }
}

/** Botão flutuante a[data-whatsapp-float]: href vem do config; sem número → oculto. */
export function bindWhatsappFloat(site, text = 'Olá, Chagas! Vim pelo site e gostaria de conversar sobre um projeto.') {
  document.querySelectorAll('a[data-whatsapp-float]').forEach((a) => {
    if (!site.whatsapp) { a.hidden = true; return; }
    a.href = waLink(site.whatsapp, text);
    a.target = '_blank';
    a.rel = 'noopener';
    if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', 'Conversar no WhatsApp (abre em nova aba)');
    a.hidden = false;
  });
}

/**
 * Checkboxes name="services" a partir de pricing.groups → items, agrupados em fieldset/legend.
 * O slot pode ser um container qualquer (div/fieldset). Valor = "Grupo — Item".
 */
export function renderServiceOptions(pricing, { extra = [] } = {}) {
  const root = clear(slot('service-options'));
  if (!root) return;
  const groups = [...pricing.groups];
  if (extra.length) groups.push({ id: 'outros', label: 'Outros', items: extra });
  if (!groups.length) {
    root.append(h('label', { class: 'form__option' }, h('input', { type: 'checkbox', name: 'services', value: 'Outro serviço' }), h('span', {}, 'Outro serviço (descreva na mensagem)')));
    return;
  }
  groups.forEach((g) => {
    root.append(h('fieldset', { class: 'form__group', dataset: { group: g.id } },
      h('legend', { class: 'form__group-legend' }, g.label),
      g.items.map((it) => {
        const id = `svc-${g.id}-${it.id}`.replace(/[^\w-]/g, '-');
        return h('label', { class: 'form__option', for: id },
          h('input', { class: 'form__option-input', type: 'checkbox', id, name: 'services', value: `${g.label} — ${it.label}`, dataset: { item: it.id } }),
          h('span', { class: 'form__option-label' }, it.label));
      })));
  });
}

/** Atualiza JSON-LD com dados reais (mantém o que já existir onde faltar). */
export function updateJsonLd(site) {
  const node = document.getElementById('ld-json');
  if (!node) return;
  try {
    const ld = JSON.parse(node.textContent);
    const graph = Array.isArray(ld['@graph']) ? ld['@graph'] : [ld];
    const person = graph.find((n) => n['@type'] === 'Person');
    const service = graph.find((n) => n['@type'] !== 'Person' && n['@type'] !== 'WebSite') || null;
    const ig = site.instagramUrl || igLink(site.instagram);
    if (person) {
      if (site.fullName || site.name) person.name = site.fullName || site.name;
      if (ig) person.sameAs = [ig];
    }
    if (service) {
      if (site.brand) service.name = site.brand;
      if (site.email) service.email = site.email;
      if (site.whatsapp) service.telephone = `+${site.whatsapp}`;
      if (site.location && !isPh(site.location) && service.address) service.address.addressLocality = site.location;
      if (site.url) service.url = site.url;
    }
    node.textContent = JSON.stringify(ld);
  } catch { /* JSON-LD inválido: ignora */ }
}
