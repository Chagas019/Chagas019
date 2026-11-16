import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_PAGES = ["/", "/oportunidades", "/talentos", "/comunidades", "/entrar", "/cadastro", "/recuperar-senha", "/termos", "/privacidade", "/design-system"];

function trackConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test.describe("páginas públicas", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} carrega sem erros, com h1 e sem rolagem horizontal`, async ({ page }) => {
      const errors = trackConsole(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });

    test(`${path} sem violações de acessibilidade (WCAG 2.2 AA)`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("home mostra a identidade e o estado de backend não configurado", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Talentos unidos.");
    await expect(page.getByText("Serviço em configuração")).toBeVisible();
  });

  test("404 amigável", async ({ page }) => {
    const res = await page.goto("/rota-que-nao-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });

  test("cabeçalhos de segurança", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("navegação", () => {
  test("links do menu levam às páginas certas", async ({ page }) => {
    await page.goto("/");
    for (const [label, path] of [["Oportunidades", "/oportunidades"], ["Talentos", "/talentos"], ["Comunidades", "/comunidades"]] as const) {
      const toggle = page.getByRole("button", { name: "Abrir menu" });
      const compact = await toggle.isVisible();
      if (compact) await toggle.click();
      const nav = compact ? page.locator("header") : page.getByRole("navigation", { name: "Navegação principal" });
      await nav.getByRole("link", { name: label, exact: true }).click();
      await expect(page).toHaveURL(path);
      await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
    }
  });

  test("menu compacto abre, fecha com Esc e devolve o foco", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Abrir menu" });
    test.skip(!(await toggle.isVisible()), "menu compacto só abaixo de 1024px");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused();
  });

  test("link de pular para o conteúdo", async ({ page, isMobile }) => {
    test.skip(isMobile, "teclado físico");
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
    await expect(skip).toBeFocused();
    await skip.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
  });

  test("troca de idioma para inglês e volta", async ({ page }) => {
    await page.goto("/termos");
    await page.getByLabel("Idioma").selectOption("en");
    await page.getByRole("button", { name: "Alterar idioma" }).click();
    await expect(page).toHaveURL("/termos");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Opportunities" })).toBeVisible();
    await page.getByLabel("Language").selectOption("pt-BR");
    await page.getByRole("button", { name: "Change language" }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  });
});

test.describe("rotas protegidas", () => {
  for (const path of ["/painel", "/perfil", "/onboarding", "/match", "/admin", "/comunidades/nova", "/comunidades/qualquer/gerenciar"]) {
    test(`${path} redireciona visitante para /entrar`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/entrar?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();
    });
  }
});
