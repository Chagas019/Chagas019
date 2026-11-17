import { prefersReducedMotion } from './dom.js';

/**
 * Revela [data-reveal] ao entrar na viewport adicionando .is-revealed.
 * Com prefers-reduced-motion (ou sem IO) tudo fica visível imediatamente.
 * O CSS só esconde quando html.js-reveal está presente → sem JS nada some.
 */
let io = null;
export function initReveal() {
  const html = document.documentElement;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    html.classList.remove('js-reveal');
    return;
  }
  html.classList.add('js-reveal');
  io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('is-revealed'); io.unobserve(e.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  observeReveal();
}

/** Chamar depois de renderizar conteúdo novo. */
export function observeReveal(root = document) {
  const nodes = root.querySelectorAll('[data-reveal]:not(.is-revealed)');
  if (!io) { nodes.forEach((n) => n.classList.add('is-revealed')); return; }
  nodes.forEach((n) => io.observe(n));
}
