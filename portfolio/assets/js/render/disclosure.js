import { h } from '../dom.js';

/**
 * Transforma um título em botão de abrir/fechar (aria-expanded + aria-controls) para `region`.
 * Só ativo enquanto `mq` casa (ex.: mobile); fora dele o título volta a ser texto e a região fica visível.
 * Retorna { open() } para abrir por código (âncoras).
 */
export function disclosure(heading, region, { mq, open = false, meta = '' } = {}) {
  if (!heading || !region) return null;
  const label = heading.textContent.trim();
  if (!region.id) region.id = `${heading.id || 'dz'}-region`;
  const btn = h('button', { class: 'disclosure', type: 'button', 'aria-controls': region.id },
    h('span', { class: 'disclosure__label' }, label),
    meta ? h('span', { class: 'disclosure__meta' }, meta) : null,
    h('span', { class: 'disclosure__icon', 'aria-hidden': 'true' }));
  const set = (on) => { btn.setAttribute('aria-expanded', String(on)); region.hidden = !on; };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  const m = mq ? window.matchMedia(mq) : null;
  const apply = () => {
    if (!m || m.matches) { heading.replaceChildren(btn); set(open); } else { heading.replaceChildren(label); region.hidden = false; }
  };
  apply();
  if (m) m.addEventListener('change', apply);
  return { open: () => { if (heading.contains(btn)) set(true); } };
}

export const MQ_MOBILE = '(max-width: 599.98px)';
export const MQ_TABLET = '(max-width: 899.98px)';
