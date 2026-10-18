// Fanzone Games — telas do portal, busca, salvos, avisos e detalhe do jogo.
(() => {
  const D = window.FANZONE;
  const porId = Object.fromEntries(D.jogos.map((j) => [j.id, j]));
  const $ = (s, el = document) => el.querySelector(s);
  const principal = $('#principal');
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = (id) => `img/${id}.webp`;

  // ---------- datas ----------
  const hoje = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const paraData = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); };
  const dias = (j) => (j.data ? Math.round((paraData(j.data) - hoje()) / 864e5) : -1);
  const dataCurta = (j) => {
    if (!j.data) return String(j.ano);
    const d = paraData(j.data);
    return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  };
  const falta = (j) => {
    const n = dias(j);
    if (n > 1) return `Em ${n} dias`;
    if (n === 1) return 'Amanhã';
    if (n === 0) return 'Hoje';
    return 'Disponível';
  };
  const juntar = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}` : lista[0]);
  const platCurta = (j) => j.plataformas.slice(0, 2).join(' · ') + (j.plataformas.length > 2 ? ' +' + (j.plataformas.length - 2) : '');

  // ---------- salvos (só neste navegador) ----------
  let salvos = [];
  try { salvos = JSON.parse(localStorage.getItem('fanzone-salvos') || '[]').filter((id) => porId[id]); } catch { salvos = []; }
  const gravar = () => { try { localStorage.setItem('fanzone-salvos', JSON.stringify(salvos)); } catch { /* sem armazenamento: vale só nesta visita */ } };
  const salvo = (id) => salvos.includes(id);
  function alternarSalvo(id) {
    salvos = salvo(id) ? salvos.filter((s) => s !== id) : [...salvos, id];
    gravar(); contador(); render();
  }
  function contador() {
    const c = $('#contador-salvos');
    c.textContent = salvos.length; c.hidden = !salvos.length;
    $('.perfil span:last-child').textContent = salvos.length ? `Visitante · ${salvos.length} salvo${salvos.length > 1 ? 's' : ''}` : 'Visitante';
  }

  // ---------- peças ----------
  const card = (j) => `
    <button class="card" type="button" data-jogo="${j.id}" aria-label="${esc(j.nome)}, ${esc(dataCurta(j))}">
      <span class="card__capa"><img src="${img(j.id)}" alt="" width="396" height="459" loading="lazy" decoding="async">${salvo(j.id) ? '<span class="card__salvo" aria-hidden="true"><svg><use href="#i-marcador"/></svg></span>' : ''}</span>
      <span class="card__genero">${esc(j.genero)}</span>
      <span class="card__nome">${esc(j.curto)}</span>
      <span class="card__linha"><span class="cinza">${esc(platCurta(j))}</span><span>${esc(dataCurta(j))}</span></span>
    </button>`;
  const fontesMini = (fs) => `<p class="fontes-mini">Fontes: ${fs.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(', ')}</p>`;
  const grade = (lista) => `<div class="grade">${lista.map(card).join('')}</div>`;
  // sem dia exato (só o ano) entra no começo daquele ano
  const chave = (j) => j.data || `${j.ano}-00-00`;
  const ordenados = () => [...D.jogos].sort((a, b) => (chave(a) < chave(b) ? -1 : 1));

  // ---------- telas ----------
  const telas = {
    inicio() {
      const h = porId[D.destaque];
      return `
        <section class="banner" aria-labelledby="banner-titulo">
          <img src="img/hero.webp" alt="" width="1408" height="492">
          <div class="banner__texto">
            <p class="banner__kicker">${dias(h) >= 0 ? 'Próximo grande lançamento' : 'Lançamento em destaque'}</p>
            <h1 class="banner__titulo" id="banner-titulo">Call of Duty®: Modern Warfare 4 –<br>PS5, Xbox e PC</h1>
            <p class="banner__linha"><span class="cinza">${esc(h.genero)}</span><span>${esc(dataCurta(h))}</span><span class="pilula">${esc(falta(h))}</span></p>
            <p class="banner__info">Também anunciado para Switch 2 · fora do PS4 e Xbox One</p>
            <button class="botao" type="button" data-jogo="${h.id}">Ver detalhes</button>
          </div>
        </section>
        <section class="secao" aria-labelledby="destaque-titulo">
          <h2 class="secao__titulo" id="destaque-titulo">Lançamentos em destaque</h2>
          ${grade(D.vitrine.map((id) => porId[id]))}
        </section>`;
    },
    lancamentos() {
      const linhas = ordenados().map((j) => {
        const n = dias(j);
        const d = j.data ? paraData(j.data) : null;
        return `
          <li><button class="linha-cal" type="button" data-jogo="${j.id}">
            <span class="linha-cal__data">${d ? `<b>${String(d.getDate()).padStart(2, '0')}</b>${MESES[d.getMonth()]} ${d.getFullYear()}` : `<b>—</b>${j.ano}`}</span>
            <img src="${img(j.id)}" alt="" loading="lazy">
            <span><span class="linha-cal__nome">${esc(j.nome)}</span><span class="linha-cal__plat">${esc(j.genero)} · ${esc(juntar(j.plataformas))}</span></span>
            <span class="status ${n < 0 ? 'status--ja' : n <= 14 ? 'status--breve' : ''}">${n < 0 ? 'Disponível' : esc(falta(j))}</span>
          </button></li>`;
      }).join('');
      return `
        <section class="secao" style="margin-top:0" aria-labelledby="cal-titulo">
          <h1 class="secao__titulo" id="cal-titulo">Calendário de lançamentos</h1>
          <p class="secao__sub">Datas conferidas em ${esc(formatarAtualizado())}. Adiamentos acontecem: cada jogo tem as fontes no detalhe.</p>
          <ul class="tabela">${linhas}</ul>
        </section>`;
    },
    dicas() {
      return `
        <section class="secao" style="margin-top:0" aria-labelledby="dicas-titulo">
          <h1 class="secao__titulo" id="dicas-titulo">Dicas</h1>
          <p class="secao__sub">Dicas tiradas de guias oficiais e da imprensa especializada.</p>
          <div class="dicas">${D.dicas.map((d) => `
            <article class="dica" id="dica-${d.id}">
              <img src="${img(d.id)}" alt="" loading="lazy">
              <div><h3>${esc(d.titulo)}</h3><ul>${d.itens.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>${fontesMini(d.fontes)}</div>
            </article>`).join('')}
          </div>
        </section>`;
    },
    plataformas() {
      const todas = [...new Set(D.jogos.flatMap((j) => j.plataformas))];
      const lista = filtroPlat ? ordenados().filter((j) => j.plataformas.includes(filtroPlat)) : ordenados();
      return `
        <section class="secao" style="margin-top:0" aria-labelledby="plat-titulo">
          <h1 class="secao__titulo" id="plat-titulo">Por plataforma</h1>
          <div class="chips" role="group" aria-label="Filtrar por plataforma">
            <button class="chip" type="button" data-plat="" aria-pressed="${!filtroPlat}">Todas</button>
            ${todas.map((p) => `<button class="chip" type="button" data-plat="${esc(p)}" aria-pressed="${filtroPlat === p}">${esc(p)}</button>`).join('')}
          </div>
          ${grade(lista)}
        </section>`;
    },
    salvos() {
      const lista = salvos.map((id) => porId[id]);
      return `
        <section class="secao" style="margin-top:0" aria-labelledby="salvos-titulo">
          <h1 class="secao__titulo" id="salvos-titulo">Salvos</h1>
          ${lista.length ? grade(lista) : `<p class="vazio"><strong>Nada salvo ainda</strong>Abra um jogo e toque em “Salvar” para acompanhar a data aqui. Os salvos ficam só neste navegador.</p>`}
        </section>`;
    },
    fontes() {
      return `
        <section class="secao" style="margin-top:0" aria-labelledby="fontes-titulo">
          <h1 class="secao__titulo" id="fontes-titulo">Fontes</h1>
          <p class="secao__sub">Tudo aqui foi pesquisado na internet em ${esc(formatarAtualizado())}. As capas são artes próprias do Fanzone, não as oficiais.</p>
          <ul class="lista-fontes">${D.jogos.map((j) => `<li><b>${esc(j.nome)}</b>${j.fontes.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}</li>`).join('')}</ul>
        </section>`;
    },
  };
  function formatarAtualizado() { const d = paraData(D.atualizado); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; }

  let tela = 'inicio';
  let filtroPlat = '';
  let termo = '';

  function render() {
    if (termo) {
      const t = termo.toLowerCase();
      const achados = D.jogos.filter((j) => [j.nome, j.genero, ...j.plataformas].join(' ').toLowerCase().includes(t));
      principal.innerHTML = `
        <section class="secao" style="margin-top:0" aria-live="polite">
          <h1 class="secao__titulo">Resultados para “${esc(termo)}”</h1>
          ${achados.length ? grade(achados) : '<p class="vazio"><strong>Nenhum jogo encontrado</strong>Tente o nome do jogo, um gênero (RPG, ação) ou uma plataforma (PS5, Switch 2).</p>'}
        </section>`;
    } else {
      principal.innerHTML = telas[tela]();
    }
    document.querySelectorAll('#menu a').forEach((a) => {
      const ativo = !termo && a.dataset.view === tela;
      a.classList.toggle('ativo', ativo);
      if (ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function irPara(hash) {
    const [nome, extra] = (hash || '#inicio').slice(1).split('-');
    tela = telas[nome] ? nome : 'inicio';
    termo = ''; $('#campo-busca').value = '';
    render();
    principal.scrollTop = 0;
    if (tela === 'dicas' && extra) {
      const alvo = document.getElementById('dica-' + extra);
      if (alvo) { alvo.classList.add('alvo'); alvo.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    }
  }
  addEventListener('hashchange', () => irPara(location.hash));
  // clicar no item da tela atual também volta ao topo e limpa a busca
  document.querySelectorAll('#menu a, .logo').forEach((a) => a.addEventListener('click', () => { if (a.getAttribute('href') === (location.hash || '#inicio')) irPara(location.hash); }));

  // ---------- listas laterais ----------
  const mini = (id, nome, nota, online) => `
    <li><button type="button" data-jogo="${id}" title="${esc(nota || (online ? 'Disponível' : 'Em ' + dataCurta(porId[id])))}">
      <span class="avatar"><img src="${img(id)}" alt="" loading="lazy">${online ? '<i class="online" aria-hidden="true"></i>' : ''}</span>
      <span>${esc(nome)}<span class="sr">, ${esc(nota || (online ? 'disponível' : 'lança em ' + dataCurta(porId[id])))}</span></span>
    </button></li>`;
  $('#jogaveis').innerHTML = D.jogaveis.map(([id, nome, nota]) => mini(id, nome, nota, true)).join('');
  $('#embreve').innerHTML = D.embreve.map((id) => mini(id, porId[id].curto, '', false)).join('');
  $('#embreve').classList.add('off');
  $('#guias').innerHTML = ['mhw', 'poe2', 'pz2', 'ffr', 'gta6'].map((id) => `
    <li><a href="#dicas-${id}"><span class="avatar"><img src="${img(id)}" alt="" loading="lazy"></span><span>${esc(D.dicas.find((d) => d.id === id).titulo)}</span></a></li>`).join('');

  // ---------- avisos (sino) ----------
  const botaoAvisos = $('#botao-avisos');
  const listaAvisos = $('#lista-avisos');
  const proximos = ordenados().filter((j) => dias(j) >= 0).slice(0, 4);
  listaAvisos.innerHTML = `<p>Próximos lançamentos</p>${proximos.map((j) => `
    <a href="#" data-jogo="${j.id}"><span class="avatar"><img src="${img(j.id)}" alt=""></span><span>${esc(j.curto)}<small>${esc(dataCurta(j))} · ${esc(falta(j))}</small></span></a>`).join('')}`;
  const fecharAvisos = () => { listaAvisos.hidden = true; botaoAvisos.setAttribute('aria-expanded', 'false'); };
  botaoAvisos.addEventListener('click', (e) => {
    e.stopPropagation();
    const abrir = listaAvisos.hidden;
    listaAvisos.hidden = !abrir; botaoAvisos.setAttribute('aria-expanded', String(abrir));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.avisos')) fecharAvisos(); });

  // ---------- detalhe ----------
  const modal = $('#modal');
  function abrirJogo(id) {
    const j = porId[id];
    if (!j) return;
    modal.innerHTML = `
      <button class="fechar" type="button" aria-label="Fechar"><svg><use href="#i-x"/></svg></button>
      <div class="modal__corpo">
        <img src="${img(j.id)}" alt="Capa ilustrativa de ${esc(j.nome)}">
        <div>
          <h2 id="modal-titulo">${esc(j.nome)}</h2>
          <p class="meta">${esc(j.genero)} · ${esc(dataCurta(j))}${j.data ? ' · ' + esc(falta(j)) : ''}</p>
          <p class="meta">${esc(juntar(j.plataformas))}</p>
          <p class="resumo">${esc(j.resumo)}</p>
          ${fontesMini(j.fontes)}
          <div class="acoes-modal">
            <button class="botao" type="button" data-salvar="${j.id}">${salvo(j.id) ? 'Remover dos salvos' : 'Salvar'}</button>
            ${D.dicas.some((d) => d.id === j.id) ? `<a class="botao botao--linha" href="#dicas-${j.id}">Ver dicas</a>` : ''}
          </div>
        </div>
      </div>`;
    if (!modal.open) modal.showModal();
  }
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('.fechar')) modal.close();
    const s = e.target.closest('[data-salvar]');
    if (s) { alternarSalvo(s.dataset.salvar); abrirJogo(s.dataset.salvar); }
    if (e.target.closest('a[href^="#dicas"]')) modal.close();
  });

  document.addEventListener('click', (e) => {
    const alvo = e.target.closest('[data-jogo]');
    if (alvo && !modal.contains(alvo)) { e.preventDefault(); fecharAvisos(); abrirJogo(alvo.dataset.jogo); }
    const chip = e.target.closest('[data-plat]');
    if (chip) { filtroPlat = chip.dataset.plat; render(); }
  });

  // ---------- busca ----------
  const campo = $('#campo-busca');
  campo.addEventListener('input', () => { termo = campo.value.trim(); render(); principal.scrollTop = 0; });
  $('#busca').addEventListener('submit', (e) => e.preventDefault());
  addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); campo.focus(); }
    if (e.key === 'Escape') fecharAvisos();
  });

  contador();
  irPara(location.hash);
})();
