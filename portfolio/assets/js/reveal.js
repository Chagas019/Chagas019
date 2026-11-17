import { prefersReducedMotion } from './dom.js';

/**
 * Revela [data-reveal] ao entrar na viewport adicionando .is-revealed.
 * Com prefers-reduced-motion (ou sem IO) tudo fica visível imediatamente.
 * O CSS só esconde quando html.js-reveal está presente → sem JS nada some.
 * Stagger: elementos que entram no mesmo lote recebem --reveal-i (0..MAX) em ordem de leitura;
 * a variável é removida ao fim para não atrasar transições de hover depois.
 */
const MAX_STEP = 5;
const STEP_MS = 70;
const CLEAR_MS = 1300; // > maior duração de reveal (hero 1100ms)
let io = null;

function revealBatch(nodes) {
  if (!nodes.length) return;
  // ordem de leitura: de cima para baixo, depois da esquerda para a direita
  const sorted = nodes
    .map((n) => ({ n, r: n.getBoundingClientRect() }))
    .sort((a, b) => (Math.abs(a.r.top - b.r.top) > 8 ? a.r.top - b.r.top : a.r.left - b.r.left));
  sorted.forEach(({ n }, i) => {
    const step = Math.min(i, MAX_STEP);
    if (step) n.style.setProperty('--reveal-i', String(step));
    n.classList.add('is-revealed');
    if (step) setTimeout(() => n.style.removeProperty('--reveal-i'), CLEAR_MS + step * STEP_MS);
  });
}

export function initReveal() {
  const html = document.documentElement;
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    html.classList.remove('js-reveal');
    return;
  }
  html.classList.add('js-reveal');
  io = new IntersectionObserver((entries) => {
    const batch = [];
    for (const e of entries) {
      if (e.isIntersecting) { batch.push(e.target); io.unobserve(e.target); }
    }
    revealBatch(batch);
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  observeReveal();
}

/** Chamar depois de renderizar conteúdo novo. */
export function observeReveal(root = document) {
  const nodes = [...root.querySelectorAll('[data-reveal]:not(.is-revealed)')];
  if (!io) { nodes.forEach((n) => n.classList.add('is-revealed')); return; }
  const vh = window.innerHeight;
  const now = [];
  nodes.forEach((n) => {
    // Acima da dobra: revela já (o clip-path do título impede o IO de detectá-lo).
    if (n.getBoundingClientRect().top < vh) now.push(n);
    else io.observe(n);
  });
  // dois frames: garante que o estado inicial (opacity 0) foi pintado antes da transição
  if (now.length) requestAnimationFrame(() => requestAnimationFrame(() => revealBatch(now)));
}
