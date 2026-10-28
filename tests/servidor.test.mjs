// Testes das contas e do banco de dados (api/conta.mjs e api/dados.mjs), com o armazém na memória.
// Uso: node tests/servidor.test.mjs
import assert from "node:assert/strict";
process.env.ARMAZEM = "memoria";
const { default: conta } = await import("../api/conta.mjs");
const { default: dados } = await import("../api/dados.mjs");
const { default: conteudo } = await import("../api/conteudo.mjs");
const { limparMemoria, atualizar } = await import("../api/_lib/armazem.mjs");

let ok = 0;
const t = async (nome, fn) => { try { await fn(); ok++; } catch (e) { console.error("✗ " + nome); throw e; } };
const chamar = async (h, { method = "POST", body, token, query } = {}) => {
  const res = { c: 0, b: null, status(c) { this.c = c; return this; }, json(b) { this.b = b; return this; }, setHeader() {} };
  await h({ method, body, query: query || {}, url: "/api", headers: token ? { authorization: "Bearer " + token } : {} }, res);
  return res;
};
const criar = (login, senha = "segredo1", nome = "Ana Souza") => chamar(conta, { body: { acao: "criar", nome, login, senha } });
const entrar = (login, senha) => chamar(conta, { body: { acao: "entrar", login, senha } });
const gravar = (token, c, id, d) => chamar(dados, { token, body: { c, id, d } });
const lerCol = (token, c) => chamar(dados, { method: "GET", token, query: { c } });

limparMemoria();
let coord, membro, visit;

await t("status mostra que as contas estão ativas", async () => {
  const r = await chamar(conta, { method: "GET" });
  assert.equal(r.c, 200); assert.equal(r.b.ativo, true); assert.equal(r.b.conta, null);
});
await t("primeira conta vira coordenação, sem confirmação de e-mail", async () => {
  const r = await criar("Ana@Exemplo.com");
  assert.equal(r.c, 200); assert.equal(r.b.conta.papel, "coordenacao"); assert.equal(r.b.conta.login, "ana@exemplo.com"); assert.ok(r.b.token);
  assert.ok(!("hash" in r.b.conta) && !("sal" in r.b.conta), "a resposta não leva a senha");
  coord = r.b.token;
});
await t("conta com nome de usuário, sem e-mail", async () => {
  const r = await criar("joao.silva", "outrasenha", "João Silva");
  assert.equal(r.c, 200); assert.equal(r.b.conta.tipo, "usuario"); assert.equal(r.b.conta.papel, null);
  visit = r.b.token;
});
await t("não deixa criar duas contas com o mesmo login", async () => assert.equal((await criar("ana@exemplo.com")).c, 409));
await t("recusa login, nome e senha inválidos", async () => {
  assert.equal((await criar("com espaço")).c, 400);
  assert.equal((await criar("maria", "123")).c, 400);
  assert.equal((await criar("maria", "segredo1", "1")).c, 400);
});
await t("entrar com e-mail ou usuário; senha errada é recusada", async () => {
  assert.equal((await entrar("ANA@exemplo.com", "segredo1")).c, 200);
  assert.equal((await entrar("joao.silva", "outrasenha")).c, 200);
  assert.equal((await entrar("joao.silva", "errada")).c, 401);
  assert.equal((await entrar("ninguem", "qualquer")).c, 401);
});
await t("token falso ou adulterado não vale", async () => {
  const r = await chamar(conta, { method: "GET", token: coord.slice(0, -3) + "abc" });
  assert.equal(r.b.conta, null);
  assert.equal((await chamar(conta, { body: { acao: "equipe" }, token: "x.y" })).c, 401);
});
await t("muitas tentativas erradas bloqueiam por 15 minutos", async () => {
  for (let i = 0; i < 8; i++) await entrar("bloqueio@exemplo.com", "x");
  assert.equal((await entrar("bloqueio@exemplo.com", "x")).c, 429);
});
await t("visitante lê o que é público, mas não publica nem vê integrantes", async () => {
  assert.equal((await gravar(visit, "agenda", "e1", { titulo: "Missa", data: "2030-01-05" })).c, 403);
  assert.equal((await gravar(null, "agenda", "e1", { titulo: "Missa", data: "2030-01-05" })).c, 401);
  const r = await lerCol(visit, "agenda,membros");
  assert.deepEqual(r.b.negadas, ["membros"]); assert.deepEqual(r.b.colecoes.agenda.docs, []);
});
await t("coordenação vê as contas e libera acesso à equipe", async () => {
  const l = await chamar(conta, { body: { acao: "equipe" }, token: coord });
  assert.equal(l.c, 200); assert.equal(l.b.contas.length, 2);
  const joao = l.b.contas.find(c => c.login === "joao.silva");
  assert.equal((await chamar(conta, { body: { acao: "papel", id: joao.id, papel: "membro" }, token: coord })).b.conta.papel, "membro");
  membro = visit;
  assert.equal((await chamar(conta, { body: { acao: "equipe" }, token: membro })).c, 403, "membro não gerencia contas");
});
await t("não deixa o site sem coordenação", async () => {
  const l = await chamar(conta, { body: { acao: "equipe" }, token: coord }), ana = l.b.contas.find(c => c.papel === "coordenacao");
  assert.equal((await chamar(conta, { body: { acao: "papel", id: ana.id, papel: "membro" }, token: coord })).c, 400);
});
await t("equipe publica agenda e escala; coordenação publica avisos", async () => {
  const r = await gravar(membro, "agenda", "e1", { titulo: "Missa", data: "2030-01-05", id: "ignorado" });
  assert.equal(r.c, 200); assert.equal(r.b.docs.length, 1); assert.equal(r.b.docs[0].id, "e1"); assert.equal(r.b.v, 1);
  assert.equal((await gravar(membro, "avisos", "a1", { titulo: "Aviso", texto: "Oi" })).c, 403);
  assert.equal((await gravar(coord, "avisos", "a1", { titulo: "Aviso", texto: "Oi" })).c, 200);
  assert.equal((await gravar(membro, "agenda", "e2", { titulo: "Sem data" })).c, 400, "data é obrigatória na agenda");
  assert.equal((await gravar(membro, "agenda", "../x", { titulo: "X", data: "2030-01-05" })).c, 400, "id estranho é recusado");
  assert.equal((await gravar(membro, "nada", "x", {})).c, 400);
});
await t("leitura pública traz o que a equipe publicou, com versão", async () => {
  const r = await lerCol(null, "agenda,avisos");
  assert.equal(r.b.colecoes.agenda.docs[0].titulo, "Missa"); assert.equal(r.b.colecoes.avisos.v, 1);
});
await t("apagar: equipe apaga da agenda; cobertura só a coordenação apaga", async () => {
  assert.equal((await gravar(membro, "coberturas", "c1", { titulo: "Festa", data: "2030-01-05" })).c, 200);
  assert.equal((await chamar(dados, { token: membro, body: { c: "coberturas", id: "c1", apagar: true } })).c, 403);
  assert.equal((await chamar(dados, { token: coord, body: { c: "coberturas", id: "c1", apagar: true } })).b.docs.length, 0);
  assert.equal((await chamar(dados, { token: membro, body: { c: "agenda", id: "e1", apagar: true } })).b.docs.length, 0);
});
await t("ids que objetos já trazem de fábrica são recusados", async () => {
  for (const id of ["__proto__", "constructor", "toString"]) assert.equal((await gravar(coord, "agenda", id, { titulo: "X", data: "2030-01-05" })).c, 400, id);
  assert.equal((await chamar(conta, { token: coord, body: { acao: "papel", id: "constructor", papel: "membro" } })).c, 404);
  assert.equal((await chamar(conta, { token: coord, body: { acao: "redefinir", id: "__proto__" } })).c, 404);
});
await t("cadastro em massa do mesmo endereço é barrado", async () => {
  const h = { "x-forwarded-for": "203.0.113.9" };
  let ultimo;
  for (let i = 0; i < 7; i++) { const res = { c: 0, b: null, status(c) { this.c = c; return this; }, json(b) { this.b = b; return this; }, setHeader() {} };
    await conta({ method: "POST", headers: h, body: { acao: "criar", nome: "Robô Teste", login: "robo" + i, senha: "segredo1" } }, res); ultimo = res; }
  assert.equal(ultimo.c, 429);
});
await t("login inexistente demora como um login de verdade", async () => {
  const t0 = Date.now(); await entrar("nao.existe", "qualquer1"); const vazio = Date.now() - t0;
  const t1 = Date.now(); await entrar("joao.silva", "qualquer1"); const real = Date.now() - t1;
  assert.ok(vazio > real / 3, `inexistente ${vazio}ms, existente ${real}ms`);
});
await t("progresso da formação fica na conta e junta os dois aparelhos", async () => {
  await chamar(conta, { token: coord, body: { acao: "progresso", progresso: { lidas: ["1", "2"], quiz: { m1: 2 } } } });
  const r = await chamar(conta, { token: coord, body: { acao: "progresso", progresso: { lidas: ["3"], quiz: { m1: 1, m2: 3 } } } });
  assert.deepEqual(r.b.progresso.lidas, ["1", "2", "3"]); assert.deepEqual(r.b.progresso.quiz, { m1: 2, m2: 3 });
  assert.deepEqual((await entrar("ana@exemplo.com", "segredo1")).b.progresso.lidas, ["1", "2", "3"]);
});
await t("coordenação gera senha provisória; a sessão antiga deixa de valer", async () => {
  const l = await chamar(conta, { body: { acao: "equipe" }, token: coord }), joao = l.b.contas.find(c => c.login === "joao.silva");
  const r = await chamar(conta, { body: { acao: "redefinir", id: joao.id }, token: coord });
  assert.equal(r.c, 200); assert.match(r.b.senha, /^[a-z2-9]{8}$/);
  assert.equal((await gravar(membro, "agenda", "e3", { titulo: "X", data: "2030-01-05" })).c, 401, "token antigo não vale mais");
  const e = await entrar("joao.silva", r.b.senha); assert.equal(e.c, 200); membro = e.b.token;
});
await t("trocar a própria senha", async () => {
  assert.equal((await chamar(conta, { token: coord, body: { acao: "senha", atual: "errada", nova: "novasenha1" } })).c, 401);
  assert.equal((await chamar(conta, { token: coord, body: { acao: "senha", atual: "segredo1", nova: "123" } })).c, 400);
  const r = await chamar(conta, { token: coord, body: { acao: "senha", atual: "segredo1", nova: "novasenha1" } });
  assert.equal(r.c, 200); coord = r.b.token;
  assert.equal((await entrar("ana@exemplo.com", "segredo1")).c, 401);
  assert.equal((await entrar("ana@exemplo.com", "novasenha1")).c, 200);
});
await t("duas gravações ao mesmo tempo não se perdem", async () => {
  await Promise.all(Array.from({ length: 8 }, (_, i) => gravar(coord, "frases", "f" + i, { texto: "Frase " + i })));
  const r = await lerCol(null, "frases");
  assert.equal(r.b.colecoes.frases.docs.length, 8);
});
await t("a IA aceita a sessão de uma conta da equipe", async () => {
  process.env.ANTHROPIC_API_KEY = "sk-teste";
  const fetchAntes = globalThis.fetch;
  globalThis.fetch = async () => ({ status: 200, ok: true, json: async () => ({ content: [{ type: "text", text: "Pronto." }], stop_reason: "end_turn" }) });
  try {
    const g = await chamar(conteudo, { method: "GET" });
    assert.equal(g.b.configurado, true, "com o banco ativo, o login já está configurado");
    const v = await criar("visitante2", "segredo1", "Pedro Lima");
    assert.equal((await chamar(conteudo, { token: v.b.token, body: { tema: "Missa de domingo às 10h" } })).c, 403);
    const r = await chamar(conteudo, { token: coord, body: { tema: "Missa de domingo às 10h" } });
    assert.equal(r.c, 200); assert.equal(r.b.texto, "Pronto.");
  } finally { globalThis.fetch = fetchAntes; delete process.env.ANTHROPIC_API_KEY; }
});
await t("atualizar tenta de novo quando alguém gravou no meio", async () => {
  let vezes = 0;
  await atualizar("teste", async v => { vezes++; if (vezes === 1) await atualizar("teste", () => ({ outro: true })); return { ...(v || {}), meu: true }; });
  assert.equal(vezes, 2);
});
console.log(`servidor: ${ok} ok`);
