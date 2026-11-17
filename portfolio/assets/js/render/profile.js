import { h, slot, clear } from '../dom.js';
import { picture } from './media.js';

/**
 * Bloco "Sobre" (hero) + painel de currículo.
 * Regras de honestidade: status "placeholder" ou valores "A CONFIRMAR" → .is-placeholder
 * com texto "A confirmar"; links vazios ocultos; sem foto → monograma com inicial.
 */
const PH_RE = /^\s*a confirmar/i;
const isPh = (v) => v == null || v === '' || PH_RE.test(String(v));
const PH_TEXT = 'A confirmar';

const LINK_LABELS = { behance: 'Behance', pinterest: 'Pinterest', drive: 'Google Drive', tiktok: 'TikTok', threads: 'Threads', instagram: 'Instagram', youtube: 'YouTube', vimeo: 'Vimeo' };

export const initials = (name = '') => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '·';

function phSpan(value, cls) {
  const ph = isPh(value);
  return h('span', { class: `${cls}${ph ? ' is-placeholder' : ''}` }, ph ? PH_TEXT : value);
}

function renderPhoto(site, profile) {
  const root = clear(slot('profile-photo'));
  if (!root) return;
  const photo = profile.photo;
  if (photo && (typeof photo === 'string' || photo.src)) {
    const img = typeof photo === 'string' ? { src: photo } : photo;
    root.append(picture({ ...img, alt: img.alt || `Retrato de ${site.name}` }, { eager: true, sizes: '(min-width: 900px) 40vw, 90vw', className: 'profile__photo' }));
    root.classList.remove('is-monogram');
  } else {
    root.classList.add('is-monogram');
    root.append(h('div', { class: 'monogram', role: 'img', 'aria-label': `Monograma ${initials(site.name)} — foto a confirmar` },
      h('span', { class: 'monogram__letter', 'aria-hidden': 'true' }, initials(site.name).slice(0, 1))));
  }
}

function renderTimeline(name, items, withOrg) {
  const root = clear(slot(name));
  if (!root) return;
  const list = items.length ? items : [{ status: 'placeholder' }];
  for (const it of list) {
    const ph = it.status === 'placeholder';
    root.append(h('li', { class: `timeline__item${ph ? ' is-placeholder' : ''}`, 'data-reveal': true },
      phSpan(ph ? '' : it.period, 'timeline__period'),
      phSpan(ph ? '' : it.title, 'timeline__title'),
      withOrg ? phSpan(ph ? '' : it.org, 'timeline__org') : null,
      ph ? h('span', { class: 'visually-hidden' }, ' (informação ainda não confirmada)') : null));
  }
}

function renderSoftware(profile) {
  const root = clear(slot('software'));
  if (!root) return;
  if (!profile.software.length) {
    root.append(h('li', { class: 'software__item is-placeholder' }, h('span', { class: 'software__name' }, PH_TEXT)));
    return;
  }
  for (const sw of profile.software) {
    const name = typeof sw === 'string' ? sw : sw.name;
    // ícone: sigla de 2 letras (sem logos de marca até haver assets licenciados)
    const abbr = (typeof sw === 'object' && sw.abbr) || name.replace(/[^A-Za-zÀ-ú]/g, '').slice(0, 2);
    root.append(h('li', { class: 'software__item' },
      h('span', { class: 'software__icon', 'aria-hidden': 'true' }, abbr),
      h('span', { class: 'software__name' }, name)));
  }
}

function renderSkills(profile) {
  const root = clear(slot('skills'));
  if (!root) return;
  if (!profile.skills.length) { root.append(h('li', { class: 'skills__item is-placeholder' }, PH_TEXT)); return; }
  profile.skills.forEach((s) => root.append(h('li', { class: 'skills__item' }, s)));
}

function renderLinks(profile) {
  const root = clear(slot('profile-links'));
  if (!root) return;
  const entries = Object.entries(profile.links).filter(([, url]) => typeof url === 'string' && /^https?:\/\//i.test(url.trim()));
  for (const [key, url] of entries) {
    const label = LINK_LABELS[key] || key;
    root.append(h('li', { class: `profile-links__item profile-links__item--${key}` },
      h('a', { href: url.trim(), target: '_blank', rel: 'noopener', 'aria-label': `${label} (abre em nova aba)` },
        h('span', { class: 'profile-links__icon', 'aria-hidden': 'true' }, label.slice(0, 2)),
        h('span', { class: 'profile-links__label' }, label))));
  }
  // sem links externos: aponta para a galeria interna (nunca link vazio)
  if (!entries.length) root.append(h('li', { class: 'profile-links__item profile-links__item--internal' }, h('a', { href: '#trabalhos' }, 'Ver trabalhos nesta página')));
}

export function renderProfile({ site, profile }) {
  document.querySelectorAll('[data-bind^="profile."]').forEach((node) => {
    const v = profile[node.dataset.bind.slice(8)];
    if (typeof v === 'string' && v) node.textContent = isPh(v) ? PH_TEXT : v;
    else if (!v) node.hidden = true;
  });
  renderPhoto(site, profile);
  renderTimeline('experience', profile.experience, true);
  renderTimeline('education', profile.education, false);
  renderSoftware(profile);
  renderSkills(profile);
  renderLinks(profile);
}
