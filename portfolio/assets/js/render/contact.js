import { h, slot, clear } from '../dom.js';

export const waLink = (num, text = '') => (num ? `https://wa.me/${String(num).replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '');
export const igLink = (user) => (user ? `https://instagram.com/${String(user).replace(/^@/, '')}` : '');

/** Preenche [data-bind="site.x"] com textContent. */
export function bindSite(site) {
  document.querySelectorAll('[data-bind^="site."]').forEach((node) => {
    const v = site[node.dataset.bind.slice(5)];
    if (!v) return;
    const ph = /^\s*a confirmar/i.test(v);
    node.textContent = ph ? 'A confirmar' : v;
    node.classList.toggle('is-placeholder', ph);
  });
  const y = slot('year'); if (y) y.textContent = String(new Date().getFullYear());
  if (site.name) document.title = `${site.name} — Fotografia e Audiovisual`;
}

export function renderContactLinks(site) {
  const items = [
    site.email && { label: 'E-mail', value: site.email, href: `mailto:${site.email}` },
    site.whatsapp && { label: 'WhatsApp', value: 'Enviar mensagem', href: waLink(site.whatsapp), ext: true },
    site.instagram && { label: 'Instagram', value: `@${String(site.instagram).replace(/^@/, '')}`, href: igLink(site.instagram), ext: true },
  ].filter(Boolean);
  for (const name of ['contact-links', 'footer-links']) {
    const root = clear(slot(name));
    if (!root) continue;
    items.forEach((it) => root.append(h('li', { class: 'contact-link' },
      h('a', { href: it.href, ...(it.ext ? { target: '_blank', rel: 'noopener' } : {}) },
        h('span', { class: 'contact-link__label' }, it.label), ' ', h('span', { class: 'contact-link__value' }, it.value)))));
  }
}

/** Preenche o <select> de serviços do formulário a partir do pricing. */
export function renderServiceOptions(pricing) {
  const sel = slot('service-options');
  if (!sel) return;
  pricing.services.forEach((s) => sel.append(h('option', { value: s.label }, s.label)));
}

/** Atualiza JSON-LD com dados reais (mantém placeholders onde faltar). */
export function updateJsonLd(site) {
  const node = document.getElementById('ld-json');
  if (!node) return;
  try {
    const ld = JSON.parse(node.textContent);
    const [person, service] = ld['@graph'];
    if (site.name) { person.name = site.name; service.name = `${site.name} — Fotografia e Audiovisual`; }
    if (site.email) service.email = site.email;
    if (site.whatsapp) service.telephone = `+${String(site.whatsapp).replace(/\D/g, '')}`;
    if (site.location && !/^\s*a confirmar/i.test(site.location)) service.address.addressLocality = site.location;
    if (site.instagram) person.sameAs = [igLink(site.instagram)];
    node.textContent = JSON.stringify(ld);
  } catch { /* JSON-LD inválido: ignora */ }
}
