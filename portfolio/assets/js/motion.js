/**
 * motion.js — microinterações (dono: Agente Motion). Chamado por main.js depois do render.
 * - Imagens lazy: .is-loading até o load → entrada suave (blur/scale em motion.css).
 * - Chips de filtro: pulso curto ao alternar (.is-toggled).
 * - Hero: parallax de ponteiro sutil nas marcas de corte/meta (só pointer fine).
 * Com prefers-reduced-motion nada disso é ligado: conteúdo fica estático e visível.
 */
import { prefersReducedMotion } from './dom.js';

const IMG_SEL = 'img.media__img';

function primeImage(img) {
  if (img.dataset.motion) return;
  img.dataset.motion = '1';
  // já carregada (cache), prioritária (LCP) ou com erro: não esconde
  if (img.complete || img.loading === 'eager') return;
  img.classList.add('is-loading');
  const done = () => {
    img.classList.remove('is-loading');
    img.removeEventListener('load', done);
    img.removeEventListener('error', done);
  };
  img.addEventListener('load', done);
  img.addEventListener('error', done);
}

function initImages() {
  document.querySelectorAll(IMG_SEL).forEach(primeImage);
  // conteúdo re-renderizado pelos filtros
  let queued = false;
  const pending = new Set();
  const flush = () => {
    queued = false;
    pending.forEach((n) => {
      if (!n.isConnected) return;
      if (n.matches(IMG_SEL)) primeImage(n);
      else n.querySelectorAll(IMG_SEL).forEach(primeImage);
    });
    pending.clear();
  };
  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) pending.add(n);
    if (pending.size && !queued) { queued = true; requestAnimationFrame(flush); }
  }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
}

function initChips() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.filters__btn');
    if (!btn) return;
    btn.classList.remove('is-toggled');
    void btn.offsetWidth; // reinicia a animação
    btn.classList.add('is-toggled');
    btn.addEventListener('animationend', () => btn.classList.remove('is-toggled'), { once: true });
  });
}

function initHeroParallax() {
  const hero = document.querySelector('.hero');
  const frame = hero && hero.querySelector('[data-hero-frame]');
  if (!frame || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let raf = 0, x = 0, y = 0;
  const apply = () => {
    raf = 0;
    frame.style.setProperty('--px', x.toFixed(3));
    frame.style.setProperty('--py', y.toFixed(3));
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(apply); };
  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = hero.getBoundingClientRect();
    x = (e.clientX - r.left) / r.width - 0.5;
    y = (e.clientY - r.top) / r.height - 0.5;
    queue();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { x = 0; y = 0; queue(); }, { passive: true });
}

export function initMotion() {
  floatAwayFromForm();
  if (prefersReducedMotion()) return;
  document.documentElement.classList.add('has-motion');
  initImages();
  initChips();
  initHeroParallax();
}

/** Esconde o WhatsApp flutuante enquanto os botões de envio do formulário estão na tela (eles já levam ao WhatsApp). */
function floatAwayFromForm() {
  const actions = document.querySelector('#quote-form [data-submit]')?.parentElement;
  if (!actions || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(([e]) => document.documentElement.classList.toggle('is-form-actions-in-view', e.isIntersecting))
    .observe(actions);
}
