import { h } from './dom.js';
import { picture, stillOf, video } from './render/media.js';
import { CONFIG } from './config.js';

/**
 * Lightbox acessível: role=dialog + aria-modal, foco preso, Esc fecha,
 * ←/→ navegam, swipe horizontal (pointer events), vídeo com controles.
 * API: openLightbox(project, startIndex, triggerEl)
 */
let root, stage, caption, counter, titleEl, prevBtn, nextBtn, closeBtn;
let items = [], index = 0, trigger = null, project = null;

function build() {
  closeBtn = h('button', { class: 'lightbox__close', type: 'button', 'aria-label': 'Fechar', 'data-lightbox-close': true }, '×');
  prevBtn = h('button', { class: 'lightbox__nav lightbox__nav--prev', type: 'button', 'aria-label': 'Anterior', 'data-lightbox-prev': true }, '←');
  nextBtn = h('button', { class: 'lightbox__nav lightbox__nav--next', type: 'button', 'aria-label': 'Próxima', 'data-lightbox-next': true }, '→');
  stage = h('div', { class: 'lightbox__stage' });
  titleEl = h('h2', { class: 'lightbox__title', id: 'lightbox-title' });
  caption = h('p', { class: 'lightbox__caption' });
  counter = h('p', { class: 'lightbox__counter', 'aria-live': 'polite' });
  root = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'data-lightbox-dialog': true, 'aria-labelledby': 'lightbox-title', hidden: true },
    h('div', { class: 'lightbox__backdrop', 'data-close': true }),
    h('div', { class: 'lightbox__frame' },
      h('header', { class: 'lightbox__bar' }, titleEl, counter, closeBtn),
      stage,
      h('footer', { class: 'lightbox__foot' }, prevBtn, caption, h('span', { class: 'lightbox__zoom', 'aria-hidden': 'true' }, '100%'), h('kbd', { class: 'lightbox__esc', 'aria-hidden': 'true' }, 'Esc'), nextBtn)));
  document.body.append(root);

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => go(-1));
  nextBtn.addEventListener('click', () => go(1));
  root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  root.addEventListener('keydown', onKey);

  // swipe
  let x0 = null, y0 = null;
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } });
  stage.addEventListener('pointerup', (e) => {
    if (x0 == null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  });
  stage.addEventListener('pointercancel', () => { x0 = null; });
}

function focusables() {
  return [...root.querySelectorAll('button, [href], video[controls], [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null);
}

function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); close(); }
  else if (e.key === 'ArrowRight' && e.target.tagName !== 'VIDEO') { e.preventDefault(); go(1); }
  else if (e.key === 'ArrowLeft' && e.target.tagName !== 'VIDEO') { e.preventDefault(); go(-1); }
  else if (e.key === 'Tab') {
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function render() {
  stage.querySelectorAll('video').forEach((v) => v.pause());
  const m = items[index];
  const node = m.type === 'video'
    ? video(m, { controls: true, className: 'lightbox__media' })
    : picture({ ...stillOf(m) }, { sizes: CONFIG.sizes.lightbox, eager: true, className: 'lightbox__media' });
  stage.replaceChildren(node);
  titleEl.textContent = project.title;
  caption.textContent = m.alt || '';
  counter.textContent = `${index + 1} / ${items.length}`;
  const multi = items.length > 1;
  prevBtn.hidden = nextBtn.hidden = !multi;
  // pré-carrega a próxima imagem
  const nxt = items[(index + 1) % items.length];
  if (multi && nxt.type !== 'video') { const i = new Image(); i.src = nxt.src; }
}

function go(step) {
  if (items.length < 2) return;
  index = (index + step + items.length) % items.length;
  render();
}

function setInert(on) {
  for (const el of document.body.children) {
    if (el === root || el.tagName === 'SCRIPT') continue;
    if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
  }
}

export function openLightbox(p, start = 0, triggerEl = null) {
  if (!p || !p.media?.length) return;
  if (!root) build();
  project = p; items = p.media; index = Math.min(start, items.length - 1);
  trigger = triggerEl || document.activeElement;
  render();
  root.hidden = false;
  document.documentElement.classList.add('is-locked');
  setInert(true);
  requestAnimationFrame(() => root.classList.add('is-open'));
  closeBtn.focus();
}

export function close() {
  if (!root || root.hidden) return;
  stage.querySelectorAll('video').forEach((v) => v.pause());
  root.classList.remove('is-open');
  root.hidden = true;
  stage.replaceChildren();
  setInert(false);
  document.documentElement.classList.remove('is-locked');
  if (trigger && document.contains(trigger)) trigger.focus();
}
