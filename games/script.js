// Fanzone — menu do celular, item ativo do menu, entrada suave e leve movimento da peça do hero.
(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // menu do celular
  const botao = document.querySelector('.hamburguer');
  const menu = document.getElementById('menu');
  const fechar = () => {
    menu.classList.remove('aberto');
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', 'Abrir menu');
  };
  botao.addEventListener('click', () => {
    const abrir = !menu.classList.contains('aberto');
    menu.classList.toggle('aberto', abrir);
    botao.setAttribute('aria-expanded', String(abrir));
    botao.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) fechar(); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('aberto')) { fechar(); botao.focus(); }
  });

  // item ativo conforme a seção na tela
  const links = [...menu.querySelectorAll('a[href^="#"]:not(.contato)')];
  const alvos = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const marcar = (id) => links.forEach((a) => {
    const ativo = a.getAttribute('href') === '#' + id;
    a.classList.toggle('ativo', ativo);
    if (ativo) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });
  const aoRolar = () => {
    const meio = innerHeight * 0.45;
    let atual = alvos[0].id;
    for (const el of alvos) if (el.getBoundingClientRect().top <= meio) atual = el.id;
    if (innerHeight + scrollY >= doc.scrollHeight - 4) {
      // no fim da página os cards dividem a tela: vale o link clicado, senão o último
      const hash = location.hash.slice(1);
      atual = alvos.some((el) => el.id === hash) ? hash : alvos[alvos.length - 1].id;
    }
    marcar(atual);
  };
  let pendente = false;
  addEventListener('scroll', () => {
    if (pendente) return;
    pendente = true;
    requestAnimationFrame(() => { pendente = false; aoRolar(); });
  }, { passive: true });
  links.forEach((a) => a.addEventListener('click', () => setTimeout(() => marcar(a.getAttribute('href').slice(1)), 600)));
  aoRolar();

  // entrada suave
  const itens = document.querySelectorAll('.hero__texto, .destaque, .sobre, .card');
  itens.forEach((el, i) => {
    el.classList.add('revelar');
    if (el.classList.contains('card')) el.style.transitionDelay = (i % 4) * 90 + 'ms';
  });
  if ('IntersectionObserver' in window && !reduz) {
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('visivel'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    itens.forEach((el) => io.observe(el));
  } else {
    itens.forEach((el) => el.classList.add('visivel'));
  }

  // a peça acompanha o mouse de leve (só com mouse e sem redução de movimento)
  const arte = document.querySelector('.hero__arte');
  if (arte && !reduz && matchMedia('(pointer: fine)').matches) {
    let alvoX = 0, alvoY = 0, x = 0, y = 0, rodando = false;
    const passo = () => {
      x += (alvoX - x) * 0.08; y += (alvoY - y) * 0.08;
      arte.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      if (Math.abs(alvoX - x) > 0.05 || Math.abs(alvoY - y) > 0.05) requestAnimationFrame(passo);
      else rodando = false;
    };
    addEventListener('pointermove', (e) => {
      alvoX = (e.clientX / innerWidth - 0.5) * 14;
      alvoY = (e.clientY / innerHeight - 0.5) * 10;
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    }, { passive: true });
  }
})();
