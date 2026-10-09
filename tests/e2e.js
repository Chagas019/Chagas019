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

async function pagina(browser, { largura = 1280, mock = null, hash = "" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: largura, height: 900 } });
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
    for (const [a, sel] of [["liturgia", ".nav"], ["agenda", ".nav"], ["gallery", ".nav"], ["search", ".top-actions"], ["settings", ".top-actions"], ["join", ".top-actions"]]) {
      await p.click(`${sel} [data-action=${a}]`);
      check(await aberto(p), `menu "${a}" abre o painel`);
      check(await p.getAttribute(`${sel} [data-action=${a}]`, "aria-current") === "true", `menu "${a}" fica marcado`);
      await p.keyboard.press("Escape"); await p.waitForTimeout(50);
      check(!(await aberto(p)), `Esc fecha "${a}"`);
    }
    await p.waitForFunction(() => document.querySelector('.nav [data-action=home]').getAttribute("aria-current") === "true", null, { timeout: 1000 }).catch(() => {});
    check(await p.getAttribute('.nav [data-action=home]', "aria-current") === "true", "ao fechar, menu volta para Início");
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
    check((await p.$$("#modal .vaga-chip")).length === 3, "funções vazias aparecem como vaga (3)");
    check(/2 de 5 funções/.test(await p.textContent("#esc-card")), "card da escala mostra 2 de 5 funções");
    await p.click('#modal [data-take="redes"] button'); await p.waitForTimeout(100);
    check(/nome/.test(await p.textContent("#toast")), "assumir sem nome pede o nome");
    await p.fill("#tk-redes", "Maria"); await p.click('#modal [data-take="redes"] button'); await p.waitForTimeout(300);
    check(/Maria/.test(await p.textContent("#modal .esc-roles")) && (await p.$$("#modal .vaga-chip")).length === 2, "assumir vaga preenche a função");
    check(/3 de 5 funções/.test(await p.textContent("#esc-card")), "card atualiza para 3 de 5 funções");
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
    await le.click(".nav [data-action=agenda]");
    check(!(await le.$("#m-ev-add")) && !(await le.$("#m-esc-add")), "leitor não vê 'Novo evento' nem 'Agendar missa'");
    await le.click("#modal [data-close]"); await le.click("#agendar"); await le.waitForTimeout(100);
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
    const nav = await p.$eval(".mobile-nav", e => getComputedStyle(e).position);
    check(nav === "fixed", "menu vira barra fixa embaixo");
    const navBottom = await p.$eval(".mobile-nav", e => innerHeight - e.getBoundingClientRect().bottom);
    check(navBottom >= 0 && navBottom <= 40, "barra do menu fica no pé da tela", "distância do fundo: " + navBottom);
    await p.mouse.wheel(0, 1500); await p.waitForTimeout(200);
    const navBottom2 = await p.$eval(".mobile-nav", e => innerHeight - e.getBoundingClientRect().bottom);
    check(Math.abs(navBottom2 - navBottom) < 2, "barra do menu continua no lugar ao rolar a página");
    for (const a of ["agenda", "liturgia", "gallery", "join", "agendar"]) {
      await p.click(a === "join" || a === "agendar" ? `.top-actions [data-action=${a}]` : `.mobile-nav [data-action=${a}]`); check(await aberto(p), `celular: menu "${a}" abre`);
      const sw = await p.evaluate(() => document.getElementById("modal").scrollWidth <= document.getElementById("modal").clientWidth + 1);
      check(sw, `celular: painel "${a}" sem rolagem lateral`);
      await fechar(p);
    }
    await p.click("#fav");
    const [t, n] = await p.evaluate(() => [document.getElementById("toast").getBoundingClientRect(), document.querySelector(".mobile-nav").getBoundingClientRect()].map(r => ({ top: r.top, bottom: r.bottom })));
    check(t.bottom <= n.top, "aviso (toast) não fica escondido atrás do menu", JSON.stringify({ t, n }));
    const pequenos = await p.$$eval(".mobile-nav button, .top-actions button, .add, .ctl, .round, #fav, .ghost-pill", els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.width < 36 || r.height < 22); }).map(e => e.id || e.className));
    check(pequenos.length === 0, "botões com tamanho tocável", pequenos.join(", "));
    check(p.erros.length === 0, "sem erros no console", p.erros.join(" | "));
    await p.context().close();
  }

  console.log("9. Formação e seções para rolar");
  {
    const p = await pagina(browser);
    await p.click(".nav [data-action=formacao]"); await p.waitForTimeout(900);
    const topo = await p.$eval("#formacao", e => e.getBoundingClientRect().top);
    check(topo >= -5 && topo < 200, "menu Formação rola até a formação", String(topo));
    check(await p.getAttribute(".nav [data-action=formacao]", "aria-current") === "true", "menu marca Formação ao rolar");
    check((await p.$$("#modules .lesson[data-licao]")).length >= 20, "formação tem pelo menos 20 páginas", String((await p.$$("#modules .lesson[data-licao]")).length));
    check(/0 de 37/.test(await p.textContent("#form-count")), "progresso começa em 0 de 37");
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
    check(/1 de 37/.test(await p.textContent("#form-count")) && /Continuar/.test(await p.textContent("#form-go")), "progresso e botão Continuar atualizam");
    await p.reload(); await p.waitForTimeout(500);
    check(/1 de 37/.test(await p.textContent("#form-count")), "progresso continua após recarregar");
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
    await p.evaluate(() => openLicao(LICOES.findIndex(l => /Como começou a Pastoral da Comunicação/.test(l.titulo))));
    check(!!(await p.$("#local-box")), "página da história tem o espaço 'E na nossa paróquia?'");
    await p.click("#hist-edit"); await p.fill("#hist-txt", "A Comunica+Fé da nossa paróquia começou com dois jovens e um celular."); await p.click("#hist-save"); await p.waitForTimeout(200);
    check(/dois jovens/.test(await p.textContent("#local-box")), "equipe salva a história da paróquia");
    await p.click("#lt-close");
    // linha do tempo
    await p.click("#tl-next"); check(/1964/.test(await p.textContent("#tl-detail")), "seta da linha do tempo avança o ano");
    await p.click('#tl-track [data-tl="0"]'); check(/1923/.test(await p.textContent("#tl-detail")), "tocar no ano mostra o fato");
    // documentos
    check((await p.$$("#docs-grid .doc")).length === 16, "mostra os 16 documentos");
    await p.click('[data-doc-f="Constituição"]'); check((await p.$$("#docs-grid .doc")).length === 4, "filtro Constituições mostra 4");
    await p.click('[data-doc-f="Decreto"]'); check((await p.$$("#docs-grid .doc")).length === 9, "filtro Decretos mostra 9");
    await p.click('[data-doc-f="Declaração"]'); check((await p.$$("#docs-grid .doc")).length === 3, "filtro Declarações mostra 3");
    await p.click("#docs-grid .doc"); check(await p.isVisible("#docs-grid .doc .tema"), "tocar no documento mostra o tema");
    // glossário e perguntas
    await p.click("#glos-grid .flip"); check(await p.getAttribute("#glos-grid .flip", "aria-pressed") === "true", "cartão do glossário vira");
    await p.click("#faq summary"); check(await p.evaluate(() => document.querySelector("#faq details").open), "pergunta frequente abre");
    // rolagem
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

  console.log("11. Núcleo holográfico: cena guiada pela rolagem");
  {
    for (const [w, h, mob] of [[1366, 850, 0], [390, 844, 1]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: !!mob, isMobile: !!mob });
      const p = await ctx.newPage(); const erros = []; p.on("pageerror", e => erros.push(e.message));
      await p.goto(URL); await p.waitForTimeout(600);
      const ini = await p.$eval("#nucleo", e => e.getBoundingClientRect().top + scrollY), len = await p.$eval("#nucleo", e => e.offsetHeight - innerHeight);
      const estado = () => p.evaluate(() => ({ topo: document.querySelector(".cine-sticky").getBoundingClientRect().top, img: document.getElementById("core").getBoundingClientRect().width, sinal: document.getElementById("hud-sig").textContent,
        copy: +getComputedStyle(document.getElementById("cine-copy")).opacity, ic: +getComputedStyle(document.querySelector(".cine-ic")).opacity, quote: +getComputedStyle(document.getElementById("cine-quote")).opacity }));
      await p.evaluate(y => scrollTo(0, y), ini); await p.waitForTimeout(250); const a = await estado();
      await p.evaluate(y => scrollTo(0, y), ini + len * .5); await p.waitForTimeout(250); const b = await estado();
      await p.evaluate(y => scrollTo(0, y), ini + len); await p.waitForTimeout(250); const c = await estado();
      check(Math.abs(b.topo) < 2 && Math.abs(c.topo) < 2, `${w}px: a cena fica presa na tela durante a rolagem`, JSON.stringify([b.topo, c.topo]));
      check(a.copy > .9 && a.ic < .05 && c.copy < .05, `${w}px: título aparece no início e some ao rolar`);
      check(c.img < a.img * .6, `${w}px: o núcleo vem de longe e se monta no centro`, JSON.stringify([a.img, c.img]));
      check(a.sinal === "000%" && c.sinal === "100%", `${w}px: indicador de sinal sobe de 0 a 100%`, a.sinal + " → " + c.sinal);
      check(await p.$("#cine-img") === null, `${w}px: a ilustração de São Carlo saiu da cena`);
      check(c.ic > .95 && c.quote > .95, `${w}px: no fim, ícones em órbita e frase visível`);
      const alvos = await p.$$eval(".cine-ic", bs => bs.map(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && r.width >= 44; }));
      check(alvos.every(Boolean), `${w}px: os 10 ícones cabem na tela e têm tamanho de toque`, alvos.join(","));
      await p.click('.cine-ic[aria-label="Frase do dia"]'); await p.waitForTimeout(200);
      check(await p.evaluate(() => document.getElementById("fw").open), `${w}px: ícone do balão abre a frase do dia`);
      await p.click("#fw-close");
      await p.click('.cine-ic[aria-label="Agenda"]'); await p.waitForTimeout(150);
      check(/Agenda da paróquia/.test(await p.textContent("#modal-body")), `${w}px: ícone da seta abre a agenda`);
      await p.click("#modal [data-close]");
      await p.click("#cine-more"); await p.waitForTimeout(150);
      check(/Venha servir/.test(await p.textContent("#modal-body")), `${w}px: Quero servir na Comunica+Fé abre a inscrição`);
      await p.click("#modal [data-close]");
      check(!erros.length, `${w}px: sem erros`, erros.join(" | "));
      await ctx.close();
    }
    const q = await pagina(browser);
    check(await q.$eval("#hero-slides .slide.on img", i => /carlo-acutis/.test(i.src)).catch(() => false), "foto de São Carlo aparece no card de destaque");
    await q.context().close();
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
        return { lateral: document.documentElement.scrollWidth > innerWidth, menus: [...document.querySelectorAll(".nav,.mobile-nav")].filter(vis).length,
          cabecalho: document.querySelector(".topbar").getBoundingClientRect().height, cortados, pequenos };
      });
      check(!r.lateral, `${nome}: sem rolagem lateral`);
      check(r.menus === 1, `${nome}: um único menu visível`, String(r.menus));
      check(r.cabecalho <= 70, `${nome}: cabeçalho em uma linha`, Math.round(r.cabecalho) + "px");
      check(!r.cortados.length, `${nome}: nada cortado nos cards`, r.cortados.join(", "));
      check(!r.pequenos.length, `${nome}: botões com tamanho de toque`, r.pequenos.join(", "));
      await p.click("#agendar"); await p.waitForTimeout(150);
      check(await p.evaluate(() => { const d = document.getElementById("modal"), b = d.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && d.scrollWidth <= d.clientWidth + 1; }), `${nome}: formulário da escala cabe na tela`);
      check(!erros.length, `${nome}: sem erros`, erros.join(" | "));
      await ctx.close();
    }
  }

  await browser.close();
  console.log(`\nResultado: ${ok} ok, ${falhas} falha(s)`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
