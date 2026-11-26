// Testes de ponta a ponta dos fluxos principais (Playwright + Chromium).
// Uso: npm run build && npm start  (em outro terminal)  →  BASE_URL=http://localhost:3000 npm run test:e2e
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let pass = 0, fail = 0;
async function check(name, fn) {
  try { await fn(); pass++; console.log("  ✓", name); }
  catch (e) { fail++; console.log("  ✗", name, "\n    ", e.message.split("\n")[0]); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && !m.text().includes("favicon") && errors.push(m.text()));
page.on("dialog", (d) => d.accept());

console.log(`VERBUM e2e em ${BASE}`);

await check("landing leva à plataforma", async () => {
  await page.goto(BASE + "/");
  await page.getByRole("link", { name: "Entrar na plataforma" }).click();
  await page.waitForURL("**/painel");
  await page.getByText("O que o Senhor colocou").waitFor();
});

await check("navegação principal abre todas as páginas", async () => {
  for (const [label, path] of [["Pesquisar", "/pesquisa"], ["Músicas", "/musicas"], ["Pregações", "/pregacoes"], ["Biblioteca", "/biblioteca"], ["Explorar", "/explorar"], ["Meu Espaço", "/meu-espaco"], ["Preparar pregação", "/assistente"]]) {
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: label, exact: true }).click();
    await page.waitForURL("**" + path);
    await page.locator("h1").first().waitFor();
  }
  await page.getByRole("link", { name: "Configurações" }).click();
  await page.waitForURL("**/configuracoes");
});

await check("pesquisa global com filtro e favoritos", async () => {
  await page.goto(BASE + "/pesquisa");
  await page.getByLabel("Pesquisar").fill("perdão");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByText("Temas reconhecidos:").waitFor();
  const all = await page.locator("article").count();
  expect(all > 5, `poucos resultados: ${all}`);
  await page.getByRole("button", { name: /^Músicas \(/ }).click();
  const cats = await page.locator("article").allInnerTexts();
  expect(cats.every((t) => t.includes("MÚSICAS")), "filtro de categoria falhou");
  await page.locator("article").first().getByRole("button", { name: /^Salvar/ }).click();
  await page.getByText(/Salvo (neste navegador|no Meu Espaço)/).waitFor();
});

await check("referência bíblica é reconhecida", async () => {
  await page.goto(BASE + "/pesquisa?q=" + encodeURIComponent("Lc 15,11-32"));
  await page.getByText("Referência válida no cânon católico").waitFor();
});

await check("histórico de pesquisas", async () => {
  await page.goto(BASE + "/pesquisa");
  await page.getByRole("link", { name: /perdão/ }).first().waitFor();
});

await check("buscador de músicas filtra por tema e salva", async () => {
  await page.goto(BASE + "/musicas");
  await page.getByRole("button", { name: "Maria", exact: true }).click();
  await page.getByText(/música\(s\) em Maria/).waitFor();
  const n = await page.locator("article").count();
  expect(n >= 4, "menos de 4 músicas marianas");
  await page.locator("article").first().getByRole("button", { name: /^Salvar/ }).click();
  await page.getByText(/Salvo/).first().waitFor();
});

await check("biblioteca: filtros e abas", async () => {
  await page.goto(BASE + "/biblioteca");
  await page.getByRole("button", { name: "Encíclica", exact: true }).click();
  const txt = await page.locator("article").allInnerTexts();
  expect(txt.length > 5 && txt.every((t) => t.includes("ENCÍCLICA")), "filtro de encíclicas");
  await page.getByRole("tab", { name: "Bíblia Sagrada" }).click();
  await page.getByText("Antigo Testamento").waitFor();
  await page.getByRole("tab", { name: "Catecismo" }).click();
  await page.getByText("Índice temático para pregadores").waitFor();
  await page.getByRole("tab", { name: "Padres e Doutores" }).click();
  await page.getByText("Padres da Igreja").waitFor();
});

await check("assistente: gera, edita, salva e reabre o roteiro", async () => {
  await page.goto(BASE + "/assistente?tema=" + encodeURIComponent("O perdão que liberta"));
  await page.getByLabel("Passagem bíblica").fill("Mt 18,21-35");
  await page.getByText("referência válida").waitFor();
  await page.locator("form button[type=submit]").click();
  await page.locator("#roteiro").waitFor({ timeout: 180_000 });
  const title = page.getByLabel("Título", { exact: true });
  await title.fill("Setenta vezes sete");
  await page.getByRole("button", { name: /^Salvar/ }).click();
  await page.waitForURL(/projeto=/);
  await page.reload();
  await page.locator("#roteiro").waitFor();
  expect((await page.getByLabel("Título", { exact: true }).inputValue()) === "Setenta vezes sete", "título não persistiu");
  await page.getByText("Fundamentação bíblica").waitFor();
});

await check("meu espaço: pasta, anotação e projeto de retiro", async () => {
  await page.goto(BASE + "/meu-espaco");
  await page.getByText("Setenta vezes sete").waitFor();
  await page.getByLabel("Nova pasta").fill("Retiro de Advento");
  await page.getByRole("button", { name: "Criar pasta" }).click();
  await page.getByRole("button", { name: "Retiro de Advento", exact: true }).waitFor();
  await page.getByRole("button", { name: "Novo encontro ou retiro" }).click();
  await page.getByLabel("Título do projeto").fill("Retiro de jovens 2026");
  await page.getByRole("button", { name: "Criar", exact: true }).click();
  await page.getByText("Retiro de jovens 2026").waitFor();
  await page.getByRole("tab", { name: /Anotações/ }).click();
  await page.getByRole("button", { name: "Nova anotação" }).click();
  await page.getByLabel("Título da anotação").fill("Testemunho de conversão");
  await page.getByLabel("Texto da anotação").fill("Ideia para a abertura.");
  await page.getByRole("button", { name: "Salvar anotação" }).click();
  await page.getByRole("heading", { name: "Testemunho de conversão" }).waitFor();
  await page.getByRole("tab", { name: /Salvos/ }).click();
  expect((await page.locator("[role=tabpanel] li").count()) >= 2, "itens salvos ausentes");
});

await check("explorar: calendário litúrgico navegável", async () => {
  await page.goto(BASE + "/explorar");
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.getByRole("button", { name: /^25: Natal do Senhor/ }).first().click().catch(async () => {
    await page.getByRole("button", { name: "Próximo mês" }).click();
  });
  await page.getByText("Próximas celebrações").waitFor();
});

await check("configurações mostram o estado das integrações", async () => {
  await page.goto(BASE + "/configuracoes");
  await page.getByText("Integrações deste servidor").waitFor();
});

await check("menu móvel abre e fecha", async () => {
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE + "/painel");
  await m.getByRole("button", { name: "Abrir menu" }).click();
  await m.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Biblioteca" }).click();
  await m.waitForURL("**/biblioteca");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(!overflow, "rolagem horizontal no celular");
  await m.close();
});

await check("APIs respondem com segurança", async () => {
  const bad = await page.request.post(BASE + "/api/assistant", { data: { tema: "x" } });
  expect(bad.status() === 400, "validação do assistente");
  const s = await (await page.request.get(BASE + "/api/status")).json();
  expect(typeof s.ai === "boolean" && !JSON.stringify(s).includes("sk-"), "status expõe dados");
});

await check("sem erros de JavaScript no console", async () => {
  expect(errors.length === 0, errors.slice(0, 3).join(" | "));
});

await browser.close();
console.log(`\n${pass} ok, ${fail} falha(s)`);
process.exit(fail ? 1 : 0);
