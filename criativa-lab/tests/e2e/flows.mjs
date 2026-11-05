// Testes E2E dos fluxos principais (modo local).
// Uso: npm run build && npm start   (em outro terminal)   →   BASE_URL=http://localhost:3000 node tests/e2e/flows.mjs [imagem.jpg]
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const IMAGE = process.argv[2];
const OUT = process.env.SHOTS_DIR;
const errors = [];
const log = (m) => console.log(`✔ ${m}`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
const esc = async (p = page) => {
  await p.keyboard.press("Escape");
  await p.getByRole("dialog").waitFor({ state: "detached" }).catch(() => null);
  await p.waitForTimeout(250);
};
const shot = async (name, p = page) => OUT && p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

// Landing
await page.goto(BASE);
await page.getByRole("heading", { level: 1 }).waitFor();
assert.match(await page.textContent("h1"), /criatividade/);
await shot("01-landing");
log("landing carrega");

// Rota protegida redireciona
await page.goto(`${BASE}/inicio`);
await page.waitForURL(/\/entrar\?next=/);
log("rota protegida redireciona para login");

// Cadastro: validação
await page.goto(`${BASE}/cadastro`);
await page.getByRole("button", { name: /Criar conta/ }).click();
await page.getByRole("alert").filter({ hasText: "nome" }).waitFor();
await page.fill("#name", "Ana Criativa");
await page.fill("#email", "ana@lab.com");
await page.fill("#password", "123");
await page.getByRole("button", { name: /Criar conta/ }).click();
await page.getByRole("alert").filter({ hasText: "6 caracteres" }).waitFor();
log("validação do cadastro");
await page.fill("#password", "senha123");
await page.getByRole("button", { name: /Criar conta/ }).click();
await page.waitForURL(/\/inicio/);
await page.getByText("Ana.").first().waitFor();
await shot("02-dashboard");
log("cadastro + saudação personalizada");

// Concluir desafio do dia pelo dashboard
await page.getByRole("button", { name: "Concluir", exact: true }).click();
await page.fill("#note", "Aprendi que a luz muda tudo.");
await page.getByRole("button", { name: /Concluir desafio/ }).click();
await page.getByText(/\+\d+/).first().waitFor();
await shot("03-celebracao");
await esc();
await page.getByText("Concluído hoje").waitFor();
log("desafio do dia concluído com celebração");

// Desafios: filtros e busca
await page.getByRole("link", { name: "Desafios" }).first().click();
await page.waitForURL(/\/desafios$/);
await page.getByRole("tab", { name: "Especiais 30 dias" }).click();
await page.getByText("2 desafios").waitFor();
await page.getByRole("tab", { name: "Todos" }).click();
await page.fill('input[type="search"]', "tipografia brutal inexistente xyz");
await page.getByText("Nada por aqui").waitFor();
await page.fill('input[type="search"]', "");
await page.getByRole("button", { name: /Tipografia/ }).first().click();
await page.getByRole("link", { name: /A palavra que age/ }).click();
await page.waitForURL(/palavra-que-age/);
await page.getByRole("button", { name: /Concluir desafio/ }).first().click();
await page.getByRole("dialog").getByRole("button", { name: /Concluir desafio/ }).click();
await page.getByText("Desafio concluído").waitFor();
await esc();
log("filtros, busca e conclusão no detalhe");

// Especial: etapa
await page.goto(`${BASE}/desafios/semana-da-cor`);
await page.getByRole("button", { name: /Concluir próxima etapa/ }).click();
await page.getByRole("dialog").getByRole("button", { name: /Concluir desafio/ }).click();
await page.getByText("1/7 concluídas").waitFor();
await esc();
log("etapa de desafio especial");

// Referências: favoritar, coleção
await page.goto(`${BASE}/referencias`);
await page.getByRole("button", { name: "Salvar nos favoritos" }).first().click();
await page.getByRole("button", { name: /Abrir referência/ }).nth(1).click();
await page.getByRole("dialog").waitFor();
await page.fill("#new-col", "Moodboard verão");
await page.getByRole("dialog").getByRole("button", { name: /Criar/ }).click();
await page.getByText("Adicionada a “Moodboard verão”").waitFor();
await shot("04-referencia");
await esc();
await page.getByRole("button", { name: /Moodboard verão/ }).click();
assert.equal(await page.getByRole("button", { name: /Abrir referência/ }).count(), 1);
await page.getByRole("button", { name: /Favoritos/ }).click();
assert.equal(await page.getByRole("button", { name: /Abrir referência/ }).count(), 2);
log("favoritos e coleções");

// Academia
await page.goto(`${BASE}/academia/teoria-das-cores`);
await page.getByRole("button", { name: /Concluir aula/ }).click();
await page.getByText("Aula concluída").first().waitFor();
await esc();
log("aula concluída");

// Gerador (motor local)
await page.goto(`${BASE}/gerador`);
await page.getByRole("button", { name: "Reels / vídeo curto" }).click();
await page.getByRole("button", { name: "Edição de vídeo" }).click();
await page.getByRole("button", { name: "Gerar ideia" }).click();
await page.getByRole("heading", { name: "Roteiro" }).waitFor();
await page.getByRole("heading", { name: "Paleta de cores" }).waitFor();
await shot("05-gerador");
await page.getByRole("button", { name: "Salvar", exact: true }).click();
await page.getByRole("button", { name: "Salva" }).waitFor();
log("gerador de ideias + salvar");

// Portfólio com imagem
await page.goto(`${BASE}/portfolio`);
await page.getByRole("button", { name: "Novo projeto" }).click();
await page.getByRole("dialog").waitFor();
await page.fill("#p-title", "Ensaio Luz de Janela");
await page.fill("#p-desc", "Retratos com uma única luz.");
await page.fill("#p-tag", "luz");
await page.keyboard.press("Enter");
if (IMAGE) {
  await page.setInputFiles('input[type="file"]', IMAGE);
  await page.getByRole("img", { name: "Imagem 1 do projeto" }).waitFor();
}
await page.getByRole("dialog").getByRole("button", { name: "Criar projeto" }).click();
await page.getByText(/Projeto “Ensaio Luz de Janela” criado/).waitFor();
await page.keyboard.press("Escape"); // fecha só a celebração
await page.getByText(/Projeto “Ensaio Luz de Janela” criado/).waitFor({ state: "detached" });
await page.getByRole("dialog").getByRole("button", { name: "Editar" }).click();
await page.fill("#p-title", "Ensaio Luz de Janela II");
await page.getByRole("button", { name: "Salvar alterações" }).click();
await page.getByRole("dialog").getByRole("heading", { name: "Ensaio Luz de Janela II" }).waitFor();
await esc();
await page.getByRole("tab", { name: /Ideias salvas \(1\)/ }).waitFor();
await shot("06-portfolio");
log("portfólio: criar, imagem, editar");

// Progresso
await page.goto(`${BASE}/progresso`);
await page.getByText("Primeira faísca").waitFor();
const hist = await page.locator("#historico li").count();
assert.ok(hist >= 6, `histórico com ${hist} itens`);
await shot("07-progresso");
log(`progresso e histórico (${hist} atividades)`);

// Configurações
await page.goto(`${BASE}/configuracoes`);
await page.fill("#s-name", "Ana Lab");
await page.getByRole("button", { name: "Fotografia" }).click();
await page.getByRole("button", { name: "Salvar perfil" }).click();
await page.getByText("Perfil atualizado.").waitFor();
log("perfil atualizado");

// Persistência: recarregar, sair e entrar
await page.reload();
await page.locator("#s-name").waitFor();
assert.equal(await page.inputValue("#s-name"), "Ana Lab");
await page.getByRole("button", { name: "Sair" }).first().click();
await page.waitForURL(/\/entrar/);
await page.fill("#email", "ana@lab.com");
await page.fill("#password", "errada1");
await page.getByRole("button", { name: "Entrar" }).click();
await page.getByRole("alert").filter({ hasText: "incorretos" }).waitFor();
await page.fill("#password", "senha123");
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(/\/inicio/);
await page.getByText("Ana.").first().waitFor();
await page.getByText("Concluído hoje").waitFor();
log("persistência após logout/login + senha errada");

// Mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await m.addInitScript(() => {});
const mp = await m.newPage();
mp.on("pageerror", (e) => errors.push(e.message));
await mp.goto(BASE);
const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
assert.ok(overflow <= 1, `landing com scroll horizontal de ${overflow}px`);
await shot("08-mobile-landing", mp);
await mp.goto(`${BASE}/cadastro`);
await mp.fill("#name", "Bia");
await mp.fill("#email", "bia@lab.com");
await mp.fill("#password", "senha123");
await mp.getByRole("button", { name: /Criar conta/ }).click();
await mp.waitForURL(/\/inicio/);
for (const path of ["/inicio", "/desafios", "/referencias", "/academia", "/gerador", "/portfolio", "/progresso", "/configuracoes", "/desafios/uma-luz-so", "/academia/tipografia"]) {
  await mp.goto(BASE + path);
  await mp.locator("main h1").first().waitFor();
  const o = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(o <= 1, `${path} com scroll horizontal de ${o}px`);
}
await mp.goto(`${BASE}/inicio`);
await shot("09-mobile-dashboard", mp);
await mp.getByRole("button", { name: "Abrir menu" }).click();
await mp.getByRole("navigation", { name: "Menu" }).getByRole("link", { name: "Meu progresso" }).click();
await mp.waitForURL(/progresso/);
log("mobile: sem scroll horizontal, menu e tab bar");

// 404
const r = await page.goto(`${BASE}/desafios/nao-existe`);
await page.getByText("Página").first().waitFor();
log("404 de desafio inexistente");

const relevant = errors.filter((e) => !/favicon|Failed to load resource.*404/.test(e));
if (relevant.length) {
  console.error("Erros de console:\n" + relevant.join("\n"));
  process.exitCode = 1;
} else log("nenhum erro de console");
await browser.close();
