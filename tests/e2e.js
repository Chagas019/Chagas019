// Testes de ponta a ponta do site da Comunica+Fé.
// Uso: NODE_PATH=$(npm root -g) node tests/e2e.js   (precisa do Playwright com Chromium)
const { chromium } = require("playwright");
const fs = require("fs"), os = require("os"), path = require("path"), { execSync } = require("child_process");

const RAIZ = path.resolve(__dirname, "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "comunicafe-e2e-"));
execSync(`bash scripts/montar-site.sh "${TMP}"`, { cwd: RAIZ, stdio: "ignore" });
for (const d of ["icones", "midia", "fotos"]) fs.cpSync(path.join(RAIZ, d), path.join(TMP, d), { recursive: true });
const URL = "file://" + path.join(TMP, "index.html");

let falhas = 0, ok = 0;
const check = (cond, nome, extra = "") => { if (cond) ok++; else { falhas++; console.log("  ✗ " + nome + (extra ? " — " + extra : "")); } };

// Simulação do ambiente do Claude: db (em memória), user e sample
function mockClaude({ can, id = "u_teste", rejeitaEscrita = false, sample = null }) {
  return `(() => {
    const cols = {}, subs = {};
    const emit = c => (subs[c] || []).forEach(cb => cb({ docs: Object.entries(cols[c] || {}).map(([id, d]) => ({ id, exists: true, data: () => d })) }));
    const err = () => Promise.reject({ code: "invalid_argument", message: "sem permissão" });
    const db = { collection: c => ({
      onSnapshot(cb) { (subs[c] ||= []).push(cb); setTimeout(() => emit(c), 0); return () => {}; },
      doc: id => ({
        set: async d => { if (${rejeitaEscrita}) return err(); (cols[c] ||= {})[id] = d; emit(c); },
        delete: async () => { if (${rejeitaEscrita}) return err(); delete (cols[c] || {})[id]; emit(c); },
      }),
    }) };
    const user = { id: async () => ${JSON.stringify(id)}, can: async () => ${JSON.stringify(can)} };
    const sample = ${sample ? `{ json: async () => (${sample}) }` : "null"};
    window.claude = { use: async n => ({ db, user, sample })[n] ?? null };
  })();`;
}

async function pagina(browser, { largura = 1280, mock = null, hash = "", conteudo = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: 900 }, acceptDownloads: true });
  // a IA do Criador de conteúdo também é simulada: por padrão, aparece como não configurada
  await ctx.route(/\/api\/conteudo/, r => conteudo ? conteudo(r) : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configurado: false, exigeLogin: true, falta: ["chave", "login"] }) }));
  if (mock) await ctx.addInitScript(mock);
  const p = await ctx.newPage();
  p.erros = [];
  p.on("pageerror", e => p.erros.push(e.message));
  p.on("console", m => { if (m.type() === "error" && !/fotos\//.test(m.location().url) && !/ERR_FILE_NOT_FOUND/.test(m.text())) p.erros.push(m.text()); });
  await p.goto(URL + hash);
  await p.waitForTimeout(500);
  return p;
}
const aberto = p => p.evaluate(() => document.getElementById("modal").open);
const fechar = async p => { if (await aberto(p)) await p.click("#modal [data-close]"); };

(async () => {
  const browser = await chromium.launch();

  console.log("1. Navegação e botões (modo local, computador)");
  {
    const p = await pagina(browser);
    check((await p.$$("h1")).length === 1, "um único h1");
    for (const [aba, re] of [["liturgia", /Liturgia de/], ["agenda", /Agenda da comunidade/], ["frases", /Frases da equipe/], ["santos", /Carlo Acutis/]]) {
      await p.click(`[data-tab=${aba}]`);
      check(await p.isVisible(`[data-painel=${aba}]`) && re.test(await p.textContent(`[data-painel=${aba}]`)), `aba "${aba}" mostra o assunto`);
      check(await p.getAttribute(`[data-tab=${aba}]`, "aria-selected") === "true" && await p.isHidden("[data-painel=inicio]"), `aba "${aba}" fica marcada e esconde as outras`);
    }
    await p.click("[data-tab=inicio]");
    check(await p.isVisible("#hoje") && await p.getAttribute("[data-tab=inicio]", "aria-selected") === "true", "aba Início volta para os cards do dia");
    for (const [a, sel] of [["search", ".top-actions"], ["settings", ".top-actions"], ["conta", ".top-actions"]]) {
      await p.click(`${sel} [data-action=${a}]`);
      check(await aberto(p), `menu "${a}" abre o painel`);
      check(await p.getAttribute(`${sel} [data-action=${a}]`, "aria-current") === "true", `menu "${a}" fica marcado`);
      await p.keyboard.press("Escape"); await p.waitForTimeout(50);
      check(!(await aberto(p)), `Esc fecha "${a}"`);
    }
    // destaque
    const nome1 = await p.textContent("#hero-name");
    await p.click("#hero-dots button >> nth=2");
    check(await p.textContent("#hero-name") !== nome1, "pontos do destaque trocam o santo");
    await p.click("#hero-open"); check(await aberto(p), "Ver história abre o santo"); await fechar(p);
    // filtro e setas do trilho
    check(await p.textContent("#count") === "8", "contagem mostra 8 cards");
    await p.selectOption("#filtro", "santos");
    check(await p.textContent("#count") === "2" && (await p.$$(".rail .card:not([hidden])")).length === 2, "filtro Santos mostra 2 cards");
    await p.selectOption("#filtro", "missas");
    check(await p.isVisible("#esc-card") && await p.isHidden("#liturgia-painel"), "filtro Missas mostra a escala e esconde a liturgia");
    await p.selectOption("#filtro", "tudo");
    const x0 = await p.$eval("#rail", r => r.scrollLeft);
    await p.click("#rail-next"); await p.waitForTimeout(600);
    check(await p.$eval("#rail", r => r.scrollLeft) > x0, "seta avança o trilho de cards");
    await p.click("#rail-prev"); await p.waitForTimeout(600);
    // santo para você + favorito
    const pick1 = await p.textContent("#pick-name");
    await p.click("#pick-next"); check(await p.textContent("#pick-name") !== pick1, "seta troca o santo para você");
    await p.click("#fav"); check(await p.getAttribute("#fav", "aria-checked") === "true", "favorito liga");
    await p.reload(); await p.waitForTimeout(400); await p.click("#pick-next");
    check(await p.getAttribute("#fav", "aria-checked") === "true", "favorito continua após recarregar");
    // missa
    await p.click("#mass-btn"); check(await p.textContent("#mass-lbl") === "Pausar", "missa: play vira Pausar");
    await p.click("#mass-btn"); check(await p.textContent("#mass-lbl") === "Retomar", "missa: pausa volta para Retomar");
    await p.evaluate(() => { massPos = MASS_TOTAL - 2; renderMass(); });
    await p.click("#mass-btn"); await p.waitForTimeout(3500);
    check(await p.textContent("#mass-lbl") !== "Pausar", "missa: ao chegar ao fim, para sozinha", await p.textContent("#mass-lbl"));
    // player
    const q1 = await p.textContent("#play-quote");
    await p.click("#q-next"); check(await p.textContent("#play-quote") !== q1, "player: próxima frase");
    await p.click("#q-cc"); check(await p.evaluate(() => document.getElementById("play-quote").hidden), "player: botão de texto esconde a frase");
    await p.click("#q-cc");
    await p.click("#q-play"); check(await p.getAttribute("#q-play", "aria-label") === "Pausar", "player: play inicia");
    await p.click("#q-play");
    await p.click("#q-count"); check(await p.evaluate(() => document.getElementById("fw").open), "contador abre a janela da frase"); await p.click("#fw-close");
    // busca
    await p.click(".top-actions [data-action=search]"); await p.fill("#q", "clara");
    check((await p.$$("#res .g-item")).length === 1, "busca por 'clara' acha 1 santo");
    await p.fill("#q", "xyzw"); check(/Nenhum santo/.test(await p.textContent("#res")), "busca sem resultado mostra aviso");
    await fechar(p);
    // configurações
    await p.click(".top-actions [data-action=settings]"); await p.click("#set-carousel");
    check(await p.getAttribute("#set-carousel", "aria-checked") === "false", "configuração do carrossel desliga"); await fechar(p);
    check(p.erros.length === 0, "sem erros no console", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("2. Cadastro (inscrição na Comunica+Fé)");
  {
    const p = await pagina(browser);
    await p.click(".follow");
    check(await aberto(p), "botão 'Venha servir' abre a inscrição");
    await p.click("#join button[type=submit]");
    check(/Preencha/.test(await p.textContent("#j-note")), "inscrição vazia mostra erro");
    await p.fill("#j-nome", "Ana Souza"); await p.fill("#j-tel", "abc");
    await p.click("#join button[type=submit]");
    check(/WhatsApp|telefone|número/i.test(await p.textContent("#j-note")), "telefone inválido é recusado", await p.textContent("#j-note"));
    await p.fill("#j-tel", "(11) 98765-4321"); await p.click("#join button[type=submit]");
    const txt = await p.textContent("#modal-body");
    check(/Ana/.test(txt), "inscrição válida confirma com o nome");
    check(!/vai falar com você/.test(txt) || await p.$("#modal a[href*='wa.me']") !== null, "não promete contato sem enviar a inscrição a ninguém", txt.slice(0, 120));
    await p.context().close();
  }

  console.log("3. Fluxos da equipe (modo local)");
  {
    const p = await pagina(browser);
    check(!(await p.isHidden("#ev-add")), "modo local: botão de novo evento visível");
    await p.click("#ev-add"); await p.click("#ev-form button[type=submit]");
    check(/título/.test(await p.textContent("#e-note")), "evento sem título é recusado");
    await p.fill("#e-t", '<img src=x onerror="window.__xss=1">Missa'); await p.fill("#e-h", "19:00"); await p.fill("#e-l", "Matriz");
    await p.click("#ev-form button[type=submit]"); await p.waitForTimeout(200);
    check((await p.$$("#ev-list .ev")).length === 1, "evento aparece no painel");
    check(!(await p.evaluate(() => window.__xss)), "texto do evento não executa código (XSS)");
    check((await p.$$("#modal .share .wa")).length === 1, "evento tem botão de WhatsApp");
    await p.click("#modal [data-del]"); check(await p.textContent("#modal [data-del] span") === "Confirmar", "excluir pede confirmação");
    await p.click("#modal [data-del]"); await p.waitForTimeout(200);
    check((await p.$$("#ev-list .ev")).length === 0, "evento excluído some do painel");
    await fechar(p);
    await p.click("#fr-add"); await p.fill("#f-t", "Só o amor é criativo."); await p.fill("#f-a", "São Maximiliano Kolbe");
    await p.click("#fr-form button[type=submit]"); await p.waitForTimeout(200);
    check(/Só o amor é criativo/.test(await p.textContent("#fr-box")), "frase publicada aparece");
    check(/Maximiliano/.test(await p.textContent("#play-sub")), "frase da equipe entra no player");
    await p.click("#litu-add"); await p.click("#lit-form button[type=submit]");
    check(/Preencha/.test(await p.textContent("#l-note")), "liturgia sem leituras é recusada");
    await p.fill("#l-1", "Gl 3,7-14"); await p.fill("#l-e", "Lc 11,15-26"); await p.click("#lit-form button[type=submit]"); await p.waitForTimeout(200);
    check(/Gl 3,7-14/.test(await p.textContent("#litu-body")), "liturgia publicada aparece");
    check(p.erros.length === 0, "sem erros no console", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("3b. Escala da missa (botão Agendar)");
  {
    const p = await pagina(browser);
    check(/Nenhuma missa/.test(await p.textContent("#esc-card")), "sem escala, card mostra 'Nenhuma missa agendada'");
    await p.click("#agendar"); check(/Agendar missa/.test(await p.textContent("#modal h2")), "Agendar abre o formulário de escala");
    await p.fill("#s-h", ""); await p.click("#esc-form button[type=submit]");
    check(/horário/.test(await p.textContent("#s-note")), "escala sem horário é recusada");
    await p.fill("#s-h", "10:00"); await p.fill("#s-l", "Igreja matriz"); await p.fill("#s-p", "Pe. Marcos");
    await p.fill("#s-foto", "Ana"); await p.fill("#s-transmissao", "João");
    await p.click("#esc-form button[type=submit]"); await p.waitForTimeout(300);
    check(/Missa dominical/.test(await p.textContent("#modal h2")), "após publicar, abre a escala");
    check((await p.$$("#modal .vaga-chip")).length === 5, "funções vazias aparecem como vaga (5)");
    check(/2 de 7 funções/.test(await p.textContent("#esc-card")), "card da escala mostra 2 de 7 funções");
    await p.click('#modal [data-take="redes"] button'); await p.waitForTimeout(100);
    check(/nome/.test(await p.textContent("#toast")), "assumir sem nome pede o nome");
    await p.fill("#tk-redes", "Maria"); await p.click('#modal [data-take="redes"] button'); await p.waitForTimeout(300);
    check(/Maria/.test(await p.textContent("#modal .esc-roles")) && (await p.$$("#modal .vaga-chip")).length === 4, "assumir vaga preenche a função");
    check(/3 de 7 funções/.test(await p.textContent("#esc-card")), "card atualiza para 3 de 7 funções");
    const wa = await p.$eval("#modal .share .wa", a => decodeURIComponent(a.href));
    check(/Redes sociais: Maria/.test(wa) && /Coordenação: vaga/.test(wa), "WhatsApp leva a escala com as vagas");
    await p.click("#esc-edit"); await p.fill("#s-coordenacao", "Pedro"); await p.click("#esc-form button[type=submit]"); await p.waitForTimeout(300);
    check(/Pedro/.test(await p.textContent("#modal .esc-roles")), "editar escala salva a mudança");
    await p.click("#modal [data-del]"); await p.click("#modal [data-del]"); await p.waitForTimeout(300);
    check(/Nenhuma missa/.test(await p.textContent("#esc-card")), "excluir escala limpa o card");
    check(p.erros.length === 0, "sem erros no console", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("4. Login e permissões (simulando o Claude)");
  {
    const ed = await pagina(browser, { mock: mockClaude({ can: true }) }); await ed.waitForTimeout(400);
    check(!(await ed.isHidden("#ev-add")), "editor vê o botão de publicar");
    check(/equipe e pode publicar/.test(await ed.textContent("[data-mode]")), "editor vê aviso de equipe");
    await ed.click("#ev-add"); await ed.fill("#e-t", "Reunião"); await ed.click("#ev-form button[type=submit]"); await ed.waitForTimeout(200);
    check((await ed.$$("#ev-list .ev")).length === 1, "editor publica evento no banco compartilhado");
    await ed.context().close();

    const le = await pagina(browser, { mock: mockClaude({ can: false }) }); await le.waitForTimeout(400);
    check(await le.isHidden("#ev-add") && await le.isHidden("#fr-add") && await le.isHidden("#litu-add"), "leitor não vê botões de publicar");
    check(/Somente leitura/.test(await le.textContent("[data-mode]")), "leitor vê aviso de somente leitura");
    await le.click("[data-tab=agenda]");
    check(!(await le.$("#corpo-agenda [data-act]")), "leitor não vê 'Novo evento' nem 'Agendar missa' na aba Agenda");
    await le.click("#agendar"); await le.waitForTimeout(100);
    check(!(await le.$("#esc-form")) && /equipe/.test(await le.textContent("#toast")), "leitor que toca em Agendar vê a agenda e um aviso");
    await le.context().close();

    const sem = await pagina(browser, { mock: mockClaude({ can: null, id: null }) }); await sem.waitForTimeout(400);
    check(await sem.isHidden("#ev-add"), "visitante sem conta não vê botões de publicar");
    await sem.context().close();

    const neg = await pagina(browser, { mock: mockClaude({ can: null, rejeitaEscrita: true }) }); await neg.waitForTimeout(400);
    await neg.click("#fr-add"); await neg.fill("#f-t", "Teste"); await neg.click("#fr-form button[type=submit]"); await neg.waitForTimeout(300);
    check(/permissão/.test(await neg.textContent("#toast")), "escrita recusada avisa falta de permissão");
    check(await neg.isHidden("#fr-add"), "após recusa, botões de publicar somem");
    check(neg.erros.length === 0, "sem erros no console", neg.erros.join(" | "));
    await neg.context().close();
  }

  console.log("5. Preenchimento automático (simulado)");
  {
    const p = await pagina(browser, { mock: mockClaude({ can: true, sample: '{ primeira: "Gl 3,7-14", salmo: "Sl 110(111)", evangelho: "Lc 11,15-26", segunda: "Rm 1,1", refrao: "" }' }) });
    await p.waitForTimeout(400);
    await p.click("#litu-add");
    check(!!(await p.$("#imp-go")), "botão 'Preencher automaticamente' aparece");
    await p.click("#imp-go"); check(/Cole o texto/.test(await p.textContent("#imp-status")), "sem texto colado, pede o texto");
    await p.fill("#imp-src", "Primeira leitura (Gl 3,7-14) ... Salmo (Sl 110(111)) ... Evangelho (Lc 11,15-26) texto longo para teste");
    await p.click("#imp-go"); await p.waitForTimeout(200);
    check(await p.inputValue("#l-1") === "Gl 3,7-14" && await p.inputValue("#l-e") === "Lc 11,15-26", "preenche referências encontradas");
    check(await p.inputValue("#l-2") === "", "descarta referência que não está no texto");
    await p.fill("#l-r", "O Senhor se lembra sempre da Aliança.");
    await p.click("#lit-form button[type=submit]"); await p.waitForTimeout(300);
    check(/Aliança/.test(await p.textContent("#fr-box")) && /Salmo responsorial/.test(await p.textContent("#fr-box")), "publicar liturgia também publica o refrão como frase do dia");
    await p.click("#litu-add"); await p.click("#lit-form button[type=submit]"); await p.waitForTimeout(300);
    await p.click("#fr-all"); check((await p.$$("#modal .m-list .m-item")).length === 1, "republicar a liturgia não duplica a frase do dia");
    await p.context().close();
  }

  console.log("6. Links diretos");
  {
    for (const [hash, esperado] of [["#liturgia", /Liturgia de/], ["#agenda", /Agenda/], ["#frases", /Frases da equipe/], ["#galeria", /Santos da comunicação/], ["#participar", /Venha servir/], ["#santo-clara-de-assis", /Santa Clara/], ["#escalas", /Escala das missas/], ["#agendar", /Agendar missa/]]) {
      const p = await pagina(browser, { hash });
      check(await aberto(p) && esperado.test(await p.textContent("#modal-body")), `link ${hash} abre a parte certa`);
      await p.context().close();
    }
  }

  console.log("7. Celular (390 px)");
  {
    const p = await pagina(browser, { largura: 390 });
    check(await p.evaluate(() => document.documentElement.scrollWidth) <= 390, "sem rolagem lateral");
    const barra = await p.$eval("#bnav", e => [getComputedStyle(e).position, Math.round(innerHeight - e.getBoundingClientRect().bottom), e.querySelectorAll("button").length]);
    check(barra[0] === "fixed" && barra[1] >= 0 && barra[1] <= 12 && barra[2] === 5, "navegação inferior fixa no rodapé, com 5 atalhos", String(barra));
    check(await p.isHidden(".tabbar"), "no celular, a barra de abas do topo dá lugar à navegação inferior");
    await p.mouse.wheel(0, 1500); await p.waitForTimeout(200);
    check(await p.$eval("#bnav", e => Math.round(innerHeight - e.getBoundingClientRect().bottom)) === barra[1], "navegação inferior continua no lugar ao rolar a página");
    check(await p.$eval("#avatar", e => e.getBoundingClientRect().right <= innerWidth), "botão da conta cabe na tela");
    for (const aba of ["agenda", "liturgia", "equipe"]) {
      await p.click(`[data-bnav=${aba}]`); await p.waitForTimeout(100);
      check(await p.isVisible(`[data-painel=${aba}]`) && await p.getAttribute(`[data-bnav=${aba}]`, "aria-current") === "page" && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `celular: atalho "${aba}" abre a aba sem rolagem lateral`);
    }
    for (const aba of ["santos", "perguntas", "cobertura", "criador"]) {
      await p.click("#menu-btn"); check(await p.isVisible("#msheet"), `celular: menu de assuntos abre (${aba})`);
      await p.click(`[data-msheet=${aba}]`); await p.waitForTimeout(100);
      check(await p.isHidden("#msheet") && await p.isVisible(`[data-painel=${aba}]`) && await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `celular: menu leva à aba "${aba}" sem rolagem lateral`);
    }
    // com dados cadastrados, as abas novas continuam sem rolagem lateral
    await p.evaluate(() => { const dia = isoDay(addD(new Date(), 2)); data.set("agenda", "x1", { titulo: "Procissão de Nossa Senhora Aparecida com a comunidade", data: dia, hora: "17:00", local: "Saída da Igreja Matriz de São Sebastião", area: "procissao" }); data.set("membros", "m1", { nome: "Maria Aparecida dos Santos Oliveira", funcoes: ["foto", "video"] }); });
    for (const aba of ["agenda", "equipe", "cobertura"]) {
      await p.evaluate(a => setTab(a), aba); await p.waitForTimeout(100);
      check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `celular: aba "${aba}" com dados, sem rolagem lateral`);
    }
    await p.evaluate(() => setTab("agenda")); await p.click('[data-ag-view="mes"]');
    check(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "celular: calendário do mês cabe na tela");
    await p.click("#menu-btn"); await p.keyboard.press("Escape"); check(await p.isHidden("#msheet"), "celular: Esc fecha o menu de assuntos");
    await p.click("[data-bnav=perfil]"); check(await aberto(p) && /Minha conta/.test(await p.textContent("#modal-body")), "celular: Perfil abre a conta"); await fechar(p);
    await p.click("[data-bnav=inicio]");
    for (const a of ["conta"]) {
      await p.click(`.top-actions [data-action=${a}]`); check(await aberto(p), `celular: botão "${a}" abre`);
      const sw = await p.evaluate(() => document.getElementById("modal").scrollWidth <= document.getElementById("modal").clientWidth + 1);
      check(sw, `celular: painel "${a}" sem rolagem lateral`);
      await fechar(p);
    }
    const heroAlt = await p.$eval("#abertura", e => e.offsetHeight / innerHeight);
    check(heroAlt <= 2, "celular: a abertura cabe em até duas telas e o painel chega cedo", heroAlt.toFixed(2));
    await p.click("#fav");
    const t = await p.evaluate(() => { const r = document.getElementById("toast").getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
    check(t.bottom <= await p.evaluate(() => innerHeight) && t.top > 0, "aviso (toast) aparece dentro da tela", JSON.stringify(t));
    const pequenos = await p.$$eval(".bnav button, .top-actions button, .add, .ctl, .round, #fav, .ghost-pill, .qcard", els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < 36 || r.height < 22); }).map(e => e.id || e.className));
    check(pequenos.length === 0, "botões com tamanho tocável", pequenos.join(", "));
    check(p.erros.length === 0, "sem erros no console", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("9. Formação e seções para rolar");
  {
    const p = await pagina(browser);
    await p.click("[data-tab=formacao]"); await p.waitForTimeout(300);
    const topo = await p.$eval("#formacao", e => e.getBoundingClientRect().top);
    check(topo >= 80 && topo < 200, "aba Formação mostra a formação logo abaixo do cabeçalho", String(topo));
    check(await p.getAttribute("[data-tab=formacao]", "aria-selected") === "true" && await p.isHidden("#abertura"), "aba Formação fica marcada e esconde o início");
    check((await p.$$("#modules .lesson[data-licao]")).length >= 20, "formação tem pelo menos 20 páginas", String((await p.$$("#modules .lesson[data-licao]")).length));
    check(/0 de 29/.test(await p.textContent("#form-count")), "progresso começa em 0 de 29");
    await p.click("#form-go");
    check(await p.evaluate(() => document.getElementById("leitor").open) && /Por que um Concílio/.test(await p.textContent("#lt-body")), "Começar abre a primeira página");
    check(await p.isDisabled("#lt-prev"), "na primeira página, Anterior fica desativado");
    await p.click("#lt-next"); await p.waitForTimeout(100);
    check(/Como o Concílio aconteceu/.test(await p.textContent("#lt-title")), "Próxima avança de página");
    await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(100);
    check(/Por que um Concílio/.test(await p.textContent("#lt-title")), "seta do teclado volta a página");
    check(await p.getAttribute("#lt-read", "aria-pressed") === "true", "página vista fica marcada como lida");
    await p.click("#lt-read"); check(await p.getAttribute("#lt-read", "aria-pressed") === "false", "dá para desmarcar como lida");
    await p.click("#lt-read");
    await p.click("#lt-close"); await p.waitForTimeout(100);
    check(/1 de 29/.test(await p.textContent("#form-count")) && /Continuar/.test(await p.textContent("#form-go")), "progresso e botão Continuar atualizam");
    await p.reload(); await p.waitForTimeout(500);
    check(/1 de 29/.test(await p.textContent("#form-count")), "progresso continua após recarregar");
    // teste do módulo
    await p.click('[data-quiz="0"]');
    await p.click("#quiz-form button[type=submit]");
    check(/Responda todas/.test(await p.textContent("#q-total")), "teste incompleto pede todas as respostas");
    await p.check('input[name="q0"][value="1"]'); await p.check('input[name="q1"][value="0"]'); await p.check('input[name="q2"][value="0"]');
    await p.click("#quiz-form button[type=submit]");
    check(/2 de 3/.test(await p.textContent("#q-total")) && (await p.$$("#quiz-form .q.err")).length === 1, "teste corrige e mostra a resposta certa");
    await p.click("#lt-close"); await p.waitForTimeout(100);
    check(/teste: 2 de 3/.test(await p.textContent('[data-mod="m1"] .mod-p')), "nota do teste aparece no módulo");
    // história local (modo local permite escrever)
    await p.evaluate(() => openLicao(LICOES.findIndex(l => /Como nasceram as equipes de comunicação/.test(l.titulo))));
    check(!!(await p.$("#local-box")), "página da história tem o espaço 'E na nossa comunidade?'");
    await p.click("#hist-edit"); await p.fill("#hist-txt", "A Comunica+Fé da nossa comunidade começou com dois jovens e um celular."); await p.click("#hist-save"); await p.waitForTimeout(200);
    check(/dois jovens/.test(await p.textContent("#local-box")), "equipe salva a história da comunidade");
    await p.click("#lt-close");
    // linha do tempo
    await p.click("[data-tab=linha]");
    await p.click("#tl-next"); check(/1964/.test(await p.textContent("#tl-detail")), "seta da linha do tempo avança o ano");
    await p.click('#tl-track [data-tl="0"]'); check(/1923/.test(await p.textContent("#tl-detail")), "tocar no ano mostra o fato");
    // documentos
    await p.click("[data-tab=documentos]");
    check((await p.$$("#docs-grid .doc")).length === 16, "mostra os 16 documentos");
    await p.click('[data-doc-f="Constituição"]'); check((await p.$$("#docs-grid .doc")).length === 4, "filtro Constituições mostra 4");
    await p.click('[data-doc-f="Decreto"]'); check((await p.$$("#docs-grid .doc")).length === 9, "filtro Decretos mostra 9");
    await p.click('[data-doc-f="Declaração"]'); check((await p.$$("#docs-grid .doc")).length === 3, "filtro Declarações mostra 3");
    await p.click("#docs-grid .doc"); check(await p.isVisible("#docs-grid .doc .tema"), "tocar no documento mostra o tema");
    // glossário e perguntas
    await p.click("[data-tab=glossario]");
    await p.click("#glos-grid .flip"); check(await p.getAttribute("#glos-grid .flip", "aria-pressed") === "true", "cartão do glossário vira");
    await p.click("[data-tab=perguntas]");
    await p.click("#faq summary"); check(await p.evaluate(() => document.querySelector("#faq details").open), "pergunta frequente abre");
    // rolagem
    await p.click("[data-tab=inicio]");
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(300);
    check(await p.isVisible("#to-top"), "botão voltar ao topo aparece ao rolar");
    await p.click("#to-top"); await p.waitForFunction(() => scrollY < 50, null, { timeout: 3000 }).catch(() => {});
    check(await p.evaluate(() => scrollY) < 50, "voltar ao topo leva ao início");
    check(p.erros.length === 0, "sem erros no console", p.erros.join(" | "));
    await p.context().close();
    const d = await pagina(browser, { hash: "#licao-7" });
    check(/Dei Verbum/.test(await d.textContent("#lt-title")), "link #licao-7 abre a página 7");
    await d.context().close();
  }

  console.log("10. Janela interativa da frase do dia");
  {
    const p = await pagina(browser);
    const fwAberta = () => p.evaluate(() => document.getElementById("fw").open);
    await p.click("#play-quote");
    check(await fwAberta(), "tocar na frase abre a janela interativa");
    const t1 = await p.textContent("#fw-text"), card1 = await p.textContent("#play-quote");
    check(t1 === card1, "janela mostra a mesma frase do card");
    await p.click("#fw-next"); await p.waitForTimeout(300);
    const t2 = await p.textContent("#fw-text");
    check(t2 !== t1 && t2 === await p.textContent("#play-quote"), "seta avança e o card acompanha");
    await p.keyboard.press("ArrowLeft"); await p.waitForTimeout(300);
    check(await p.textContent("#fw-text") === t1, "seta do teclado volta a frase");
    const box = await p.$eval("#fw-stage", e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await p.mouse.move(box.x + 120, box.y); await p.mouse.down(); await p.mouse.move(box.x - 120, box.y, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(300);
    check(await p.textContent("#fw-text") === t2, "arrastar para o lado troca a frase");
    await p.click("#fw-play"); check(await p.getAttribute("#fw-play", "aria-label") === "Pausar", "Ouvir inicia a leitura");
    check(await p.getAttribute("#q-play", "aria-label") === "Pausar", "player do card acompanha a janela");
    await p.click("#fw-play");
    await p.click("#fw-fav"); check(await p.getAttribute("#fw-fav", "aria-pressed") === "true", "favoritar marca o coração");
    await p.click('[data-sheet="all"]'); check(await p.isVisible("#fw-sheet-all"), "Todas as frases abre a lista");
    check((await p.$$("#fw-list .fw-item")).length >= 13, "lista mostra todas as frases");
    await p.click('[data-fwf="favoritas"]'); check((await p.$$("#fw-list .fw-item")).length === 1, "filtro Favoritas mostra a favorita");
    await p.click('[data-fwf="todas"]'); await p.fill("#fw-q", "gentileza");
    check((await p.$$("#fw-list .fw-item")).length === 1, "busca encontra a frase");
    await p.click("#fw-list .fw-item"); await p.waitForTimeout(200);
    check(/gentileza/.test(await p.textContent("#fw-text")) && await p.isHidden("#fw-sheet-all"), "escolher na lista mostra a frase e fecha a lista");
    await p.click('[data-sheet="share"]');
    const wa = await p.$eval("#fw-sheet-share .wa", a => decodeURIComponent(a.href));
    check(/gentileza/.test(wa) && /Francisco de Sales/.test(wa), "compartilhar leva a frase e o autor ao WhatsApp");
    await p.click('[data-sheet="img"]'); await p.waitForTimeout(600);
    const dims = await p.$eval("#fw-img", i => [i.naturalWidth, i.naturalHeight]);
    check(dims[0] === 1080 && dims[1] === 1920, "imagem para stories em 1080×1920", dims.join("x"));
    await p.click('[data-fmt="post"]'); await p.waitForTimeout(500);
    check((await p.$eval("#fw-img", i => i.naturalHeight)) === 1350, "formato feed em 1080×1350");
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 10000 }).catch(() => null), p.click("#fw-save")]);
    check(dl && /frase-do-dia-.*-feed\.png/.test(dl.suggestedFilename()), "baixar imagem gera o arquivo PNG", dl ? dl.suggestedFilename() : "sem download");
    await p.keyboard.press("Escape"); await p.waitForTimeout(100);
    if (await fwAberta()) await p.click("#fw-close");
    check(!(await fwAberta()), "Esc ou X fecham a janela");
    await p.reload(); await p.waitForTimeout(500); await p.click("#q-count"); await p.click('[data-sheet="all"]'); await p.click('[data-fwf="favoritas"]');
    check((await p.$$("#fw-list .fw-item")).length === 1, "favoritas continuam após recarregar");
    check(p.erros.length === 0, "sem erros no console", p.erros.join(" | "));
    await p.context().close();
    for (const [w, h] of [[390, 844], [820, 1180]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 700 });
      const m = await ctx.newPage(); await m.goto(URL + "#frase"); await m.waitForTimeout(500);
      const r = await m.evaluate(() => { const d = document.getElementById("fw"); const btns = [...d.querySelectorAll(".fw-actions button")].map(b => b.getBoundingClientRect());
        return { open: d.open, cabe: d.scrollWidth <= innerWidth, botoes: btns.every(b => b.bottom <= innerHeight && b.height >= 44) }; });
      check(r.open && r.cabe && r.botoes, `janela da frase em ${w}px: abre pelo link, cabe na tela e os botões ficam visíveis`, JSON.stringify(r));
      await ctx.close();
    }
  }

  console.log("11. Página inicial em blocos");
  {
    for (const [w, h, mob] of [[1366, 850, 0], [390, 844, 1]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!mob, isMobile: !!mob }); await ctx.route(/\/api\//, r => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
      const p = await ctx.newPage(); const erros = []; p.on("pageerror", e => erros.push(e.message));
      await p.goto(URL); await p.waitForTimeout(500);
      check(await p.evaluate(() => !document.querySelector(".show, .scene, #disc, .srail, .objs")), `${w}px: a abertura antiga com rolagem guiada saiu`);
      const r = await p.evaluate(() => {
        const cs = e => getComputedStyle(e), b = document.querySelector(".bento");
        const blocos = [".bh", ".bq", "#hoje", ".bv", ".be", ".bc", ".bf"].map(sel => !!b.querySelector(sel));
        return { blocos, borda: cs(b).borderTopWidth, sombra: cs(b).boxShadow, fundo: cs(document.body).backgroundColor, logo: cs(document.querySelector(".logo")).backgroundColor,
          raio: cs(b).borderTopLeftRadius, laranja: cs(document.querySelector(".bv")).backgroundColor, destaque: cs(document.querySelector(".bh-h em")).color, lateral: document.documentElement.scrollWidth > innerWidth };
      });
      check(r.blocos.every(Boolean), `${w}px: abertura, acesso rápido, destaques, avisos, eventos, convite e formação em blocos`, JSON.stringify(r.blocos));
      check(r.borda === "1px" && r.sombra === "none" && parseFloat(r.raio) >= 20, `${w}px: moldura arredondada com linha fina e sem sombra`, r.borda + " " + r.sombra + " " + r.raio);
      check(r.fundo === "rgb(44, 44, 42)" && r.laranja === "rgb(255, 90, 31)" && r.destaque === "rgb(255, 90, 31)", `${w}px: cores do leiaute (grafite e laranja)`, JSON.stringify(r));
      check(!r.lateral, `${w}px: sem rolagem lateral`);
      await p.waitForTimeout(300);
      check(/const liturgia_de_hoje/.test(await p.textContent("#bh-code")), `${w}px: quadro roxo mostra a liturgia de hoje`);
      await p.click('[data-hero="servir"]'); await p.waitForTimeout(150);
      check(/Venha servir/.test(await p.textContent("#modal-body")), `${w}px: botão do coração abre a inscrição`); await p.click("#modal [data-close]");
      await p.click('.bh [data-hero="share"]'); await p.waitForTimeout(150);
      check(/Compartilhar o site/.test(await p.textContent("#modal-body")), `${w}px: compartilhar abre o painel`); await p.click("#modal [data-close]");
      await p.click('.bh [data-hero="frase"]'); await p.waitForTimeout(200);
      check(await p.evaluate(() => document.getElementById("fw").open), `${w}px: botão de aspas abre a frase do dia`); await p.click("#fw-close");
      await p.click('.bc [data-action="join"]'); await p.waitForTimeout(150);
      check(/Venha servir/.test(await p.textContent("#modal-body")), `${w}px: “Quero servir” do bloco roxo abre a inscrição`); await p.click("#modal [data-close]");
      check(!erros.length, `${w}px: sem erros`, erros.join(" | "));
      await ctx.close();
    }
    const q = await pagina(browser);
    check(await q.$eval("#hero-slides .slide.on img", i => /carlo-acutis/.test(i.src)).catch(() => false), "foto de São Carlo aparece no card de destaque");
    await q.context().close();
  }

  console.log("12. Formação: câmera do celular");
  {
    const p = await pagina(browser);
    const txt = sel => p.textContent(sel);
    check(/Configure seu celular e aprenda a fotografar como um profissional/.test(await txt("#cam-h")), "seção da câmera tem o título");
    await p.click("[data-tab=formacao]"); await p.click("#form-cam"); await p.waitForTimeout(300);
    const topo = await p.$eval("#camera", e => e.getBoundingClientRect().top);
    check(topo >= 80 && topo < 200 && await p.getAttribute("[data-tab=camera]", "aria-selected") === "true", "atalho da formação abre a aba da câmera", String(topo));
    check((await p.$$("#cam-phones [role=radio]")).length === 6 && (await p.$$("#cam-objs [role=radio]")).length === 9, "seletor com 6 celulares e 8 objetivos (mais Todos)");
    check(/Escolha a categoria/.test(await txt("#cam-tips .dep")), "sem categoria, pede para escolher o celular");
    await p.click('[data-cam-cat="and-avancado"]');
    check(await p.getAttribute('[data-cam-cat="and-avancado"]', "aria-checked") === "true", "categoria fica marcada");
    check(/Modo Pro/.test(await txt("#cam-tips .dep")), "Android avançado mostra recursos que dependem do modelo");
    check(await p.getAttribute('[data-cam-mod="m3"]', "aria-selected") === "true", "categoria abre as aulas certas");
    await p.click('[data-cam-obj="reels"]');
    check(/9:16/.test(await txt("#cam-tips")) && !/Modo Pro/.test(await txt("#cam-tips")), "filtro por objetivo muda as dicas");
    await p.focus('[data-cam-cat="and-avancado"]'); await p.keyboard.press("ArrowRight");
    check(await p.getAttribute('[data-cam-cat="ip-antigo"]', "aria-checked") === "true", "setas do teclado trocam a categoria");
    check(/Como gravar vídeos bonitos com um iPhone antigo/.test(await txt("#cam-panel")), "aula especial do iPhone antigo");
    await p.click('[data-cam-mod="m1"]');
    check(/Como conseguir boas fotos com um celular simples/.test(await txt("#cam-panel")) && /Desafio 1/.test(await txt("#cam-panel")), "módulo do Android básico com aula especial e desafio");
    await p.check('#cam-panel [data-cam-desafio="1"]');
    check((await p.$$('[data-cam-mod="m1"] .ok')).length === 1, "desafio concluído aparece na aba");
    check((await p.$$("#cam-sits .cam-sit")).length === 5 && /Desafio 6/.test(await txt("#cam-sits")), "situações A a E e desafio 6");
    check((await p.$$("#cam-table tbody tr")).length === 9 && /Pontos de partida/.test(await txt("#cam-tabela")), "tabela com 9 objetivos e o aviso de ponto de partida");
    check(/Gravar Vídeo/.test(await txt("#cam-menus")) && /Pro \/ Manual/.test(await txt("#cam-menus")), "guia de menus do iPhone e do Android");
    await p.reload(); await p.waitForTimeout(500);
    check(await p.getAttribute('[data-cam-cat="ip-antigo"]', "aria-checked") === "true" && await p.isChecked('[data-cam-desafio="1"]').catch(() => false) === false, "categoria salva após recarregar");
    await p.click('[data-cam-mod="m1"]');
    check(await p.isChecked('#cam-panel [data-cam-desafio="1"]'), "desafio continua concluído após recarregar");
    // assistente
    check(/escolha a marca, o objetivo, o ambiente e o tipo de cena/.test(await txt("#cam-result")), "assistente diz o que falta");
    const wiz = async (marca, modelo, obj, amb, cena) => {
      await p.selectOption("#wz-marca", marca); await p.fill("#wz-modelo", modelo);
      for (const [n, v] of [["obj", obj], ["amb", amb], ["cena", cena]]) await p.click(`#cam-wiz label:has(input[name="${n}"][value="${v}"])`);
      return txt("#cam-result");
    };
    let r = await wiz("iphone", "iPhone 11", "foto", "escuro", "parados");
    check(/iPhone 11/.test(r) && /Modo Noite/.test(r) && /Fotografia/.test(r) && !/Vídeo: comece/.test(r), "iPhone 11: reconhece o modelo e o Modo Noite");
    r = await wiz("iphone", "iphone 6", "video", "escuro", "movimento");
    check(/até 1080p/.test(r) && /30 fps/.test(r) && /não tem vídeo 4K/.test(r), "iPhone 6: sem 4K e 30 fps no escuro");
    r = await wiz("iphone", "iPhone 15 Pro", "ambos", "claro", "movimento");
    check(/Apple Log/.test(r) && /60 fps/.test(r) && /Modo Ação/.test(r), "iPhone 15 Pro: recursos Pro, 60 fps com luz");
    r = await wiz("iphone", "iPhone 16e", "video", "claro", "parados");
    check(/uma só lente/.test(r), "iPhone 16e: avisa que a configuração é diferente");
    r = await wiz("samsung", "Galaxy A15", "foto", "misto", "altar");
    check(/não vamos adivinhar/.test(r) && /Galaxy/.test(r) && !/balanço de branco/.test(r), "Android desconhecido: não inventa ficha técnica");
    await p.click('[data-cam-cat="and-avancado"]');
    check(/balanço de branco/.test(await txt("#cam-result")), "Android avançado no seletor libera as dicas de modo Pro");
    check(await p.getAttribute(".credit a", "href") === "https://www.instagram.com/chagas_catolico/" && /Site criado por/.test(await txt(".credit")), "rodapé mostra quem criou o site");
    check(!p.erros.length, "câmera sem erros", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("13. Abas: um assunto por aba");
  {
    const p = await pagina(browser);
    const abas = await p.$$eval("#tabs [role=tab]", bs => bs.map(b => b.dataset.tab));
    check(abas.length === 14 && abas[0] === "inicio", "barra com 14 abas, começando pelo Início", abas.join(","));
    for (const aba of abas) {
      await p.click(`[data-tab=${aba}]`);
      const vis = await p.$$eval("[data-painel]", ps => ps.filter(e => !e.hidden).map(e => e.dataset.painel));
      check(vis.length === 1 && vis[0] === aba, `aba "${aba}" mostra só o seu assunto`, vis.join(","));
    }
    check(await p.isVisible("footer.colophon"), "rodapé aparece em todas as abas");
    await p.focus("[data-tab=perguntas]"); await p.keyboard.press("ArrowLeft");
    check(await p.getAttribute("[data-tab=glossario]", "aria-selected") === "true", "setas do teclado trocam de aba");
    await p.click("[data-tab=agenda]");
    check(await p.evaluate(() => location.hash) === "#aba-agenda", "endereço acompanha a aba");
    await p.click('#corpo-agenda [data-act="ev-add"]'); check(await aberto(p) && !!(await p.$("#ev-form")), "aba Agenda: Novo evento abre o formulário");
    await p.fill("#e-t", "Encontro da Comunica+Fé"); await p.click("#ev-form button[type=submit]"); await p.waitForTimeout(200); await fechar(p);
    check(/Encontro da Comunica\+Fé/.test(await p.textContent("#corpo-agenda")), "evento publicado aparece na aba Agenda");
    await p.click("#corpo-agenda [data-evento]"); await p.click("#modal [data-del]"); await p.click("#modal [data-del]"); await p.waitForTimeout(200);
    check(!/Encontro da Comunica\+Fé/.test(await p.textContent("#corpo-agenda")), "excluir na aba Agenda tira o evento");
    await p.click("[data-tab=frases]"); await p.click('#corpo-frases [data-action="quotes"]');
    check(await p.evaluate(() => document.getElementById("fw").open), "aba Frases abre a frase do dia"); await p.click("#fw-close");
    await p.click("[data-tab=santos]"); await p.click("#corpo-santos .g-item >> nth=0");
    check(await aberto(p) && /Carlo Acutis/.test(await p.textContent("#modal-body")), "aba Santos abre a história do santo"); await fechar(p);
    check(!p.erros.length, "abas sem erros", p.erros.join(" | "));
    await p.context().close();
    for (const [hash, aba] of [["#aba-liturgia", "liturgia"], ["#camera", "camera"], ["#documentos", "documentos"]]) {
      const q = await pagina(browser, { hash });
      check(await q.getAttribute(`[data-tab=${aba}]`, "aria-selected") === "true" && await q.isVisible(`[data-painel=${aba}]`), `link ${hash} abre a aba certa`);
      await q.context().close();
    }
  }

  console.log("14. Conta: login de cada pessoa");
  {
    const sem = await pagina(browser);
    await sem.click("#avatar");
    check(/ainda não foram ativadas/.test(await sem.textContent("#modal-body")), "sem Firebase configurado, a conta explica que o login não foi ativado");
    await sem.context().close();

    const p = await pagina(browser, { mock: fs.readFileSync(path.join(__dirname, "firebase-falso.js"), "utf8") });
    await p.click("#avatar");
    for (const prov of ["google", "facebook", "apple"]) check(!!(await p.$(`[data-prov=${prov}]`)), `botão “Continuar com ${prov}” aparece`);
    await p.click("[data-modo=criar]");
    await p.fill("#c-nome", "Maria Clara"); await p.fill("#c-email", "maria@exemplo.com"); await p.fill("#c-senha", "123"); await p.fill("#c-senha2", "123");
    await p.click("#conta-form button[type=submit]");
    check(/6 caracteres/.test(await p.textContent("#c-note")), "senha curta é recusada");
    await p.fill("#c-senha", "fe2026!"); await p.fill("#c-senha2", "outra1"); await p.click("#conta-form button[type=submit]");
    check(/diferentes/.test(await p.textContent("#c-note")), "senhas diferentes são recusadas");
    await p.fill("#c-senha2", "fe2026!"); await p.click("#conta-form button[type=submit]"); await p.waitForTimeout(200);
    check(await p.textContent("#avatar") === "MC" && await p.evaluate(() => document.getElementById("avatar").classList.contains("logado")), "conta criada: botão mostra as iniciais");
    check(/Maria Clara/.test(await p.textContent("#modal-body")) && /Sair da conta/.test(await p.textContent("#modal-body")), "janela da conta mostra o perfil");
    await fechar(p);
    await p.evaluate(() => { lidas.add(LICOES[0].key); saveForm(); });
    await p.waitForTimeout(900);
    check(await p.evaluate(() => (window.__fbDocs["usuarios/u_maria@exemplo.com"]?.lidas || []).includes(LICOES[0].key)), "progresso da formação fica salvo na conta");
    await p.click("#avatar"); await p.click("#conta-sair"); await p.waitForTimeout(100);
    check(await p.textContent("#avatar") === "EU", "sair da conta volta ao botão EU");
    await p.click("#avatar"); await p.fill("#c-email", "maria@exemplo.com"); await p.fill("#c-senha", "errada1"); await p.click("#conta-form button[type=submit]");
    check(/incorretos/.test(await p.textContent("#c-note")), "senha errada mostra aviso em português");
    await p.fill("#c-senha", "fe2026!"); await p.click("#conta-form button[type=submit]"); await p.waitForTimeout(200);
    check(await p.textContent("#avatar") === "MC", "entrar com e-mail e senha funciona");
    await p.click("#conta-sair"); await p.waitForTimeout(100);
    await p.click("#avatar"); await p.fill("#c-email", "maria@exemplo.com"); await p.click("#c-esqueci");
    check(/nova senha/.test(await p.textContent("#c-note")) && await p.evaluate(() => window.__reset) === "maria@exemplo.com", "esqueci minha senha envia o e-mail");
    await p.click("[data-prov=google]"); await p.waitForTimeout(200);
    check(await p.evaluate(() => window.__ultimoProv) === "google.com" && await p.textContent("#avatar") === "FT", "entrar com Google usa o provedor do Google");
    check(!p.erros.length, "conta sem erros", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("15. Trocar o dia na escala");
  {
    const p = await pagina(browser);
    const d = new Date(), iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const dia1 = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3)), dia2 = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 10));
    await p.click("#agendar"); await p.fill("#s-d", dia1); await p.fill("#s-h", "10:00"); await p.fill("#s-l", "Igreja matriz"); await p.fill("#s-foto", "Ana"); await p.fill("#s-video", "Bruno");
    await p.click("#esc-form button[type=submit]"); await p.waitForTimeout(300);
    check(!!(await p.$('#modal [data-trocar$="/foto"]')), "função preenchida tem o botão Trocar dia");
    await p.click('#modal [data-trocar$="/foto"]');
    check(/Trocar o dia/.test(await p.textContent("#modal h2")) && /Ana/.test(await p.textContent("#modal-body")), "Trocar dia abre o formulário com o nome da pessoa");
    await p.click("#tr-form button[type=submit]");
    check(/diferente/.test(await p.textContent("#tr-note")), "o mesmo dia e horário é recusado");
    await p.fill("#tr-d", dia2); await p.click("#tr-form button[type=submit]"); await p.waitForTimeout(300);
    const lista = await p.evaluate(() => escalas.map(e => ({ data: e.data, hora: e.hora, local: e.local, funcoes: e.funcoes })));
    const nova = lista.find(e => e.data === dia2), velha = lista.find(e => e.data === dia1);
    check(nova && nova.funcoes.foto === "Ana" && nova.hora === "10:00" && nova.local === "Igreja matriz", "nova escala no dia escolhido com a pessoa na mesma função", JSON.stringify(lista));
    check(velha && !velha.funcoes.foto && velha.funcoes.video === "Bruno", "a função fica vaga na escala de antes e o resto não muda");
    // Bruno também troca para o mesmo dia: entra na escala que já existe, sem criar outra
    await fechar(p); await p.evaluate(() => openTrocaDia(escalas.find(e => e.funcoes.video).id, "video"));
    await p.fill("#tr-d", dia2); await p.click("#tr-form button[type=submit]"); await p.waitForTimeout(300);
    const l2 = await p.evaluate(() => escalas.map(e => ({ data: e.data, funcoes: e.funcoes })));
    check(l2.filter(e => e.data === dia2).length === 1 && l2.find(e => e.data === dia2).funcoes.video === "Bruno", "trocar para um dia que já tem escala usa essa escala");
    // função ocupada no destino é recusada
    await fechar(p); await p.click("#agendar"); await p.fill("#s-d", dia1); await p.fill("#s-h", "10:00"); await p.fill("#s-foto", "Carla"); await p.click("#esc-form button[type=submit]"); await p.waitForTimeout(300);
    await p.click('#modal [data-trocar$="/foto"]'); await p.fill("#tr-d", dia2); await p.click("#tr-form button[type=submit]");
    check(/Ana/.test(await p.textContent("#tr-note")), "não troca para uma função que já tem alguém");
    // pela aba Equipe, nos compromissos da pessoa
    await fechar(p); await p.evaluate(() => data.set("membros", "m1", { nome: "Carla", funcoes: ["foto"], ativo: true })); await p.waitForTimeout(100);
    await p.click("[data-tab=equipe]"); await p.click('[data-eq="m1"]');
    check(!!(await p.$('#corpo-equipe [data-trocar]')), "compromissos da pessoa na aba Equipe têm Trocar dia");
    check(!p.erros.length, "trocar o dia sem erros", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("16. Painel inicial, agenda e avisos (modo local)");
  {
    const p = await pagina(browser);
    const d = new Date(), iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const amanha = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
    check(/Comunicação/.test(await p.textContent("#show-h")) && /evangeliza/.test(await p.textContent("#show-h")), "abertura com o título “Comunicação que evangeliza.”");
    check(/Liturgia, agenda, formação e comunicação da comunidade em um só lugar/.test(await p.textContent(".bh-sub")), "abertura com a nova descrição");
    check(/Acessar painel/.test(await p.textContent(".bh-cta")) && /Ver agenda/.test(await p.textContent(".bh-cta")), "abertura com os botões Acessar painel e Ver agenda");
    await p.click('.bh [data-ir="painel"]'); await p.waitForFunction(() => Math.abs(document.getElementById("painel").getBoundingClientRect().top) < 200, null, { timeout: 3000 }).catch(() => {});
    check(await p.evaluate(() => Math.abs(document.getElementById("painel").getBoundingClientRect().top) < 200), "Acessar painel leva ao painel");
    check((await p.$$("#quick .qcard")).length === 6, "acesso rápido com 6 cartões");
    for (const [n, aba] of [[0, "agenda"], [1, "liturgia"], [2, "equipe"], [3, "cobertura"], [4, "formacao"], [5, "criador"]]) {
      await p.click("[data-tab=inicio]"); await p.click(`#quick .qcard >> nth=${n}`);
      check(await p.isVisible(`[data-painel=${aba}]`), `cartão ${n + 1} do acesso rápido abre "${aba}"`);
    }
    await p.click("[data-tab=inicio]");
    check(/Nenhum evento marcado/.test(await p.textContent("#prox")) && /Nenhum aviso/.test(await p.textContent("#avisos")), "sem dados, eventos e avisos mostram estado vazio");
    // evento novo pela aba Agenda
    await p.click("[data-tab=agenda]"); await p.click('#corpo-agenda [data-act="ev-add"]');
    await p.fill("#e-t", "Retiro dos jovens"); await p.fill("#e-d", amanha); await p.fill("#e-h", "19:30"); await p.fill("#e-l", "Salão da comunidade");
    await p.click('#ev-form label:has(input[value="retiro"])'); await p.click("#ev-form button[type=submit]"); await p.waitForTimeout(200);
    check(!(await aberto(p)) && /Retiro dos jovens/.test(await p.textContent("#corpo-agenda")) && /Retiro/.test(await p.textContent("#corpo-agenda .evi .ds-chip")), "evento publicado aparece na agenda com a categoria");
    await p.click("[data-tab=inicio]");
    check(/Retiro dos jovens/.test(await p.textContent("#prox")) && /19:30/.test(await p.textContent("#prox")) && /Salão da comunidade/.test(await p.textContent("#prox")), "painel mostra o próximo evento com data, hora e local");
    await p.click('#prox [data-evento]');
    check(await aberto(p) && /Adicionar à minha agenda/.test(await p.textContent("#modal-body")), "Detalhes abre o evento");
    const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.click("#ev-ics")]);
    const ics = dl ? fs.readFileSync(await dl.path(), "utf8") : "";
    check(dl && /\.ics$/.test(dl.suggestedFilename()) && /SUMMARY:Retiro dos jovens/.test(ics) && /DTSTART:\d{8}T193000/.test(ics) && /TRIGGER:-PT1H/.test(ics), "evento vira arquivo .ics com lembrete", dl ? dl.suggestedFilename() : "sem download");
    await p.click("#ev-edit"); await p.fill("#e-t", "Retiro de jovens"); await p.click("#ev-form button[type=submit]"); await p.waitForTimeout(200);
    check(/Retiro de jovens/.test(await p.textContent("#modal h2")) && /Retiro de jovens/.test(await p.textContent("#prox")), "editar evento salva a mudança e volta ao evento");
    await fechar(p);
    await p.click('#prox [data-evento]'); await p.click("#ev-cancel"); await p.waitForTimeout(200); await fechar(p);
    check(/Cancelado/.test(await p.textContent("#prox")) && !!(await p.$("#prox .evi.cancelado")), "cancelar evento marca como cancelado");
    // visões da agenda
    await p.click("[data-tab=agenda]");
    await p.click('[data-ag-view="mes"]');
    check((await p.$$("#corpo-agenda .mes .d")).length === 42 && (await p.$$("#corpo-agenda .mes .wd")).length === 7, "visão do mês mostra o calendário");
    await p.click(`[data-ag-dia="${amanha}"]`);
    check(await p.getAttribute('[data-ag-view="dia"]', "aria-pressed") === "true" && /Retiro de jovens/.test(await p.textContent("#corpo-agenda")), "tocar no dia abre a visão do dia com o evento");
    await p.click('[data-ag-view="semana"]'); check((await p.$$("#corpo-agenda .sem .linha")).length === 7, "visão da semana mostra 7 dias");
    await p.click('[data-ag-view="proximos"]'); await p.click('[data-ag-cat="reuniao"]');
    check(!/Retiro de jovens/.test(await p.textContent("#corpo-agenda")), "filtro por categoria esconde os outros eventos");
    await p.click('[data-ag-cat="todas"]');
    // avisos
    await p.click("[data-tab=inicio]");
    check(await p.isVisible("#aviso-add"), "modo local: botão Novo aviso aparece");
    await p.click("#aviso-add"); await p.click("#av-form button[type=submit]");
    check(/Preencha/.test(await p.textContent("#av-note")), "aviso sem texto é recusado");
    await p.fill("#av-t", "Missa em novo horário"); await p.fill("#av-x", "A missa de domingo passa a ser às 8h."); await p.check("#av-fixo");
    await p.click("#av-form button[type=submit]"); await p.waitForTimeout(200);
    check(/Missa em novo horário/.test(await p.textContent("#avisos")) && !!(await p.$("#avisos .aviso.fixo")), "aviso publicado e fixado aparece no painel");
    await p.click("[data-aviso-del]"); await p.click("[data-aviso-del]"); await p.waitForTimeout(200);
    check(/Nenhum aviso/.test(await p.textContent("#avisos")), "excluir aviso tira do painel");
    check((await p.$$("#ftea .ftile")).length === 4, "painel mostra materiais de formação");
    check(!p.erros.length, "painel e agenda sem erros", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("17. Equipe, escala e cobertura (modo local)");
  {
    const p = await pagina(browser);
    const d = new Date(), iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    const dia = iso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 2));
    await p.click("[data-tab=equipe]");
    check(/Nenhum integrante/.test(await p.textContent("#corpo-equipe")), "sem integrantes, mostra estado vazio");
    for (const [nome, fn] of [["Ana Souza", "foto"], ["João Lima", "video"]]) {
      await p.click("#mb-add"); await p.fill("#mb-n", nome); await p.click(`#mb-form label:has(input[value="${fn}"])`); await p.click("#mb-form button[type=submit]"); await p.waitForTimeout(150);
    }
    await p.click("#mb-add"); await p.fill("#mb-n", "ana souza"); await p.click("#mb-form button[type=submit]");
    check(/Já existe/.test(await p.textContent("#mb-note")), "nome repetido na equipe é recusado"); await fechar(p);
    check((await p.$$("#corpo-equipe .eqc")).length === 2, "integrantes cadastrados aparecem como cartões");
    // duas escalas no mesmo dia com a mesma pessoa
    for (const [hora, fk, cel] of [["10:00", "foto", "Missa dominical"], ["11:00", "video", "Batizado"]]) {
      await p.evaluate(() => openEscalaForm());
      await p.selectOption("#s-c", cel); await p.fill("#s-d", dia); await p.fill("#s-h", hora); await p.fill(`#s-${fk}`, "Ana Souza");
      await p.click("#esc-form button[type=submit]"); await p.waitForTimeout(200);
      if (hora === "11:00") {
        check(/Atenção: Ana Souza já está em Missa dominical/.test(await p.textContent("#s-note")), "escala avisa conflito de horário da mesma pessoa");
        await p.click("#esc-form button[type=submit]"); await p.waitForTimeout(200);
      }
      await fechar(p);
    }
    await p.click("[data-tab=equipe]");
    check((await p.$$("#corpo-equipe .fn.conflito")).length >= 2, "escalas com conflito ficam marcadas");
    check(/falta/.test(await p.textContent("#corpo-equipe .pend")) && /no mesmo dia/.test(await p.textContent("#corpo-equipe .pend")), "pendências mostram vagas e conflitos");
    await p.click('#corpo-equipe .eqc:has-text("Ana Souza")');
    check(/Compromissos de Ana/.test(await p.textContent("#corpo-equipe")) && (await p.$$("#corpo-equipe [data-confirmar]")).length === 2, "tocar na pessoa mostra os compromissos dela");
    await p.click("#corpo-equipe [data-confirmar] >> nth=0"); await p.waitForTimeout(200);
    check((await p.$$("#corpo-equipe [data-confirmar]")).length === 1 && (await p.$$("#corpo-equipe .fn.conf")).length >= 1, "confirmar presença marca a função");
    // cobertura
    await p.click("[data-tab=cobertura]");
    check(/Privacidade/.test(await p.textContent("#corpo-cobertura")) && (await p.$$("#cob-ev option")).length === 2, "cobertura lista os eventos sem checklist e o aviso de privacidade");
    await p.click("#cob-criar"); await p.waitForTimeout(200);
    check((await p.$$("#corpo-cobertura .cob-i .chk li")).length === 11, "checklist criada com 11 itens");
    await p.click('#corpo-cobertura [data-cob$="/ambiente"]'); await p.waitForTimeout(100);
    check(await p.getAttribute('#corpo-cobertura [data-cob$="/ambiente"]', "data-st") === "andamento", "item passa para Em andamento");
    await p.click('#corpo-cobertura [data-cob$="/ambiente"]'); await p.waitForTimeout(100);
    check(await p.getAttribute('#corpo-cobertura [data-cob$="/ambiente"]', "data-st") === "concluido" && /1 de 11 concluídos/.test(await p.textContent("#corpo-cobertura")), "item concluído conta no progresso");
    check((await p.$$("#cob-ev option")).length === 1, "evento com checklist sai da lista de novos");
    // formação
    await p.click("[data-tab=formacao]");
    check((await p.$$("#cat-f .ftile")).length === 12 && (await p.$$('#cat-f .ftile[aria-disabled="true"]')).length === 3, "catálogo com 12 assuntos e 3 em preparação");
    await p.click('#cat-f .ftile:has-text("Espiritualidade do comunicador")'); await p.waitForTimeout(200);
    check(await p.evaluate(() => document.getElementById("leitor").open) && /Espiritualidade/.test(await p.textContent("#lt-mod")), "assunto disponível abre o material");
    await p.click("#lt-close");
    check(!p.erros.length, "equipe e cobertura sem erros", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("18. Criador de conteúdo");
  {
    const off = await pagina(browser); await off.click("[data-tab=criador]"); await off.waitForTimeout(200);
    check(/ainda não foi ativada/.test(await off.textContent("#cri-status")) && /ANTHROPIC_API_KEY/.test(await off.textContent("#cri-status")), "sem chave, o criador diz o que falta para ativar");
    await off.fill("#cri-tema", "Festa de São Francisco no sábado"); await off.click("#cri-go");
    check(/não está ativa/.test(await off.textContent("#cri-note")), "sem IA, gerar avisa e sugere copiar o pedido");
    await off.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await off.click("#cri-copiar-pedido"); await off.waitForTimeout(100);
    const pedido = await off.evaluate(() => navigator.clipboard.readText()).catch(() => "");
    check(/Nunca invente citações/.test(pedido) && /Festa de São Francisco/.test(pedido), "copiar pedido leva as regras e o tema");
    check(!off.erros.length, "criador desligado sem erros", off.erros.join(" | "));
    await off.context().close();

    let enviado = null;
    const on = await pagina(browser, { conteudo: r => r.request().method() === "POST" ? (enviado = r.request().postDataJSON(), r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ texto: "Legenda pronta para a festa." }) }))
      : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ configurado: true, exigeLogin: false, falta: [] }) }) });
    await on.click("[data-tab=criador]"); await on.waitForTimeout(200);
    check(/IA ativa/.test(await on.textContent("#cri-status")), "com a IA configurada, mostra que está ativa");
    await on.click("#cri-go"); check(/Escreva o tema/.test(await on.textContent("#cri-note")), "sem tema, pede o tema");
    await on.click('[data-cri-tipo="reels"]'); await on.click('[data-cri-tam="curto"]'); await on.selectOption("#cri-pub", "Jovens");
    await on.fill("#cri-tema", "Missa dos jovens, sexta às 19h"); await on.click("#cri-go"); await on.waitForTimeout(300);
    check(/Legenda pronta/.test(await on.textContent("#cri-out")) && await on.isVisible("#cri-copiar"), "conteúdo gerado aparece com o botão de copiar");
    check(enviado && enviado.tipo === "reels" && enviado.tamanho === "curto" && enviado.publico === "Jovens" && /jovens/.test(enviado.tema) && !("prompt" in enviado), "o site manda só as escolhas; o texto do pedido é montado no servidor", JSON.stringify(enviado));
    check(!on.erros.length, "criador sem erros", on.erros.join(" | "));
    await on.context().close();

    const cl = await pagina(browser, { mock: mockClaude({ can: true, sample: '{ texto: "Texto feito pelo Claude." }' }) }); await cl.waitForTimeout(400);
    await cl.click("[data-tab=criador]"); await cl.waitForTimeout(100);
    check(/IA do Claude/.test(await cl.textContent("#cri-status")), "no Claude, usa a IA do Claude");
    await cl.fill("#cri-tema", "Novena de Natal na comunidade"); await cl.click("#cri-go"); await cl.waitForTimeout(200);
    check(/Texto feito pelo Claude/.test(await cl.textContent("#cri-out")), "no Claude, gera o conteúdo");
    await cl.context().close();
  }

  console.log("19. Firebase: permissões da equipe (Firebase de teste)");
  {
    const p = await pagina(browser, { mock: fs.readFileSync(path.join(__dirname, "firebase-falso.js"), "utf8") }); await p.waitForTimeout(300);
    await p.click("[data-tab=agenda]");
    check(!(await p.$('#corpo-agenda [data-act="ev-add"]')) && /Entre com a conta da equipe/.test(await p.textContent("#corpo-agenda")), "sem login, a agenda é só leitura");
    await p.click("[data-tab=equipe]"); check(/aparece para quem faz parte da equipe/.test(await p.textContent("#corpo-equipe")), "sem login, a lista da equipe fica protegida");
    await p.click("#avatar"); await p.click("[data-modo=criar]");
    await p.fill("#c-nome", "Rita Alves"); await p.fill("#c-email", "rita@exemplo.com"); await p.fill("#c-senha", "fe2026!"); await p.fill("#c-senha2", "fe2026!");
    await p.click("#conta-form button[type=submit]"); await p.waitForTimeout(300);
    check(/ainda não faz parte da equipe/.test(await p.textContent("#modal-body")) && /u_rita@exemplo.com/.test(await p.textContent("#modal-body code")), "conta nova mostra o código para pedir acesso");
    await p.click("#conta-sair"); await p.waitForTimeout(100);
    await p.evaluate(() => { window.__fbDocs["equipe/u_rita@exemplo.com"] = { papel: "membro" }; });
    await p.click("#avatar"); await p.fill("#c-email", "rita@exemplo.com"); await p.fill("#c-senha", "fe2026!"); await p.click("#conta-form button[type=submit]"); await p.waitForTimeout(300); await fechar(p);
    await p.click("[data-tab=agenda]");
    check(!!(await p.$('#corpo-agenda [data-act="ev-add"]')) && /pode publicar na agenda/.test(await p.textContent("#corpo-agenda")), "integrante da equipe pode publicar na agenda");
    await p.click('#corpo-agenda [data-act="ev-add"]'); await p.fill("#e-t", "Reunião da equipe de comunicação"); await p.click("#ev-form button[type=submit]"); await p.waitForTimeout(300);
    check(await p.evaluate(() => Object.entries(window.__fbDocs).some(([k, v]) => k.startsWith("agenda/") && v.titulo === "Reunião da equipe de comunicação")), "evento fica gravado no Firestore");
    await p.click("[data-tab=inicio]"); check(await p.isHidden("#aviso-add"), "integrante comum não publica avisos");
    await p.click("#avatar"); await p.click("#conta-sair"); await p.waitForTimeout(100);
    await p.evaluate(() => { window.__fbDocs["equipe/u_rita@exemplo.com"] = { papel: "coordenacao" }; });
    await p.click("#avatar"); await p.fill("#c-email", "rita@exemplo.com"); await p.fill("#c-senha", "fe2026!"); await p.click("#conta-form button[type=submit]"); await p.waitForTimeout(300);
    check(!!(await p.$("#acesso-form")), "coordenação vê o formulário para liberar acesso");
    await p.fill("#ac-uid", "Xk3pQ9aB7cD1eF2gH4iJ5kL6mN7o"); await p.click("#acesso-form button[type=submit]"); await p.waitForTimeout(200);
    check(await p.evaluate(() => (window.__fbDocs["equipe/Xk3pQ9aB7cD1eF2gH4iJ5kL6mN7o"] || {}).papel) === "membro", "coordenação libera o acesso de outra pessoa");
    await fechar(p);
    check(await p.isVisible("#aviso-add"), "coordenação publica avisos");
    await p.click("#aviso-add"); await p.fill("#av-t", "Aviso da coordenação"); await p.fill("#av-x", "Reunião na quinta."); await p.click("#av-form button[type=submit]"); await p.waitForTimeout(300);
    check(/Aviso da coordenação/.test(await p.textContent("#avisos")), "aviso da coordenação aparece para todos");
    check(!p.erros.length, "Firebase sem erros", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("8. Celular, tablet e notebook (12 tamanhos de tela)");
  {
    const TELAS = [["celular 360", 360, 740, 1], ["celular 390", 390, 844, 1], ["celular 430", 430, 932, 1], ["celular deitado", 844, 390, 1],
      ["tablet 768", 768, 1024, 1], ["tablet 820", 820, 1180, 1], ["tablet deitado", 1024, 768, 1], ["tablet 1180", 1180, 820, 1],
      ["notebook 1280", 1280, 800, 0], ["notebook 1366", 1366, 768, 0], ["notebook 1440", 1440, 900, 0], ["monitor 1920", 1920, 1080, 0]];
    for (const [nome, w, h, toque] of TELAS) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!toque, isMobile: !!toque && w < 700 });
      const p = await ctx.newPage(); const erros = []; p.on("pageerror", e => erros.push(e.message));
      await p.goto(URL); await p.waitForTimeout(500);
      const r = await p.evaluate(() => {
        const vis = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
        const cortados = [];
        document.querySelectorAll(".card:not([hidden]) .body").forEach(bd => { const c = bd.getBoundingClientRect(); [...bd.children].forEach(ch => { if (vis(ch) && !ch.classList.contains("scroll") && ch.getBoundingClientRect().bottom > c.bottom + 1) cortados.push(ch.id || ch.className); }); });
        document.querySelectorAll(".card h3,.card .title,.big-date,.chip,.topbar *,.subhead *").forEach(e => { if (vis(e) && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === "visible") cortados.push(e.id || e.className); });
        const pequenos = [...document.querySelectorAll("button,a,select,[role=switch]")].filter(vis).filter(e => { const b = e.getBoundingClientRect(); return (b.height < 32 || b.width < 32) && !e.closest(".dots") && !e.closest(".colophon"); }).map(e => e.id || e.className);
        return { lateral: document.documentElement.scrollWidth > innerWidth, menus: [...document.querySelectorAll(".nav,.mobile-nav,.bnav")].filter(vis).length,
          cabecalho: document.querySelector(".topbar").getBoundingClientRect().height, cortados, pequenos };
      });
      check(!r.lateral, `${nome}: sem rolagem lateral`);
      check(r.menus === 1, `${nome}: um único menu visível`, String(r.menus));
      check(r.cabecalho <= 70, `${nome}: cabeçalho em uma linha`, Math.round(r.cabecalho) + "px");
      check(!r.cortados.length, `${nome}: nada cortado nos cards`, r.cortados.join(", "));
      check(!r.pequenos.length, `${nome}: botões com tamanho de toque`, r.pequenos.join(", "));
      await p.evaluate(() => openEscalaForm()); await p.waitForTimeout(150);
      check(await p.evaluate(() => { const d = document.getElementById("modal"), b = d.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && d.scrollWidth <= d.clientWidth + 1; }), `${nome}: formulário da escala cabe na tela`);
      check(!erros.length, `${nome}: sem erros`, erros.join(" | "));
      await ctx.close();
    }
  }

  await browser.close();
  console.log(`\nResultado: ${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
