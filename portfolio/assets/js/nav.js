/**
 * Navegação: menu responsivo (aria-expanded), estado de scroll no header
 * (.is-scrolled), seção ativa (aria-current) via IntersectionObserver.
 */
export function initNav() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('[data-nav-toggle]') || document.querySelector('.nav-toggle');
  const nav = document.querySelector('[data-nav-menu]') || document.getElementById('site-nav');
  if (!header || !toggle || !nav) return;

  const label = toggle.querySelector('.nav-toggle__label');
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Fechar' : 'Menu';
    header.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('is-nav-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { setOpen(false); toggle.focus(); return; }
    // foco preso no menu aberto (botão + links)
    if (e.key === 'Tab') {
      const f = [toggle, ...nav.querySelectorAll('a[href]')];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 75em)').addEventListener('change', (mq) => { if (mq.matches) setOpen(false); });

  // estado de scroll
  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => header.classList.toggle('is-scrolled', !e.isIntersecting)).observe(sentinel);

  // seção ativa
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const sections = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.removeAttribute('aria-current'));
      map.get(e.target.id)?.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}
