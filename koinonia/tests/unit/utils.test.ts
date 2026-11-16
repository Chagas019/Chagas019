import { describe, expect, it } from "vitest";
import { initials, safeRedirectPath, slugify } from "@/lib/utils";
import { isProtectedPath } from "@/lib/supabase/proxy";
import { parsePage, sanitizeSearch } from "@/services/pagination";

describe("slugify", () => {
  it("remove acentos e símbolos", () => {
    expect(slugify("Paróquia São José — Campinas!")).toBe("paroquia-sao-jose-campinas");
  });
});

describe("safeRedirectPath (open redirect)", () => {
  it.each([
    ["/painel", "/painel"],
    ["/oportunidades?x=1", "/oportunidades?x=1"],
    ["https://evil.example", "/painel"],
    ["//evil.example", "/painel"],
    ["/\\evil.example", "/painel"],
    ["javascript:alert(1)", "/painel"],
    ["/\t/evil.example", "/painel"],
    ["/\n/evil.example", "/painel"],
    ["/%09/evil.example", "/%09/evil.example"],
    ["/ok\\..\\evil", "/painel"],
    [null, "/painel"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});

describe("initials", () => {
  it("gera iniciais", () => {
    expect(initials("Maria Clara Souza")).toBe("MS");
    expect(initials("  ")).toBe("?");
  });
});

describe("rotas protegidas", () => {
  it.each(["/painel", "/perfil", "/onboarding", "/match", "/admin", "/comunidades/nova", "/comunidades/x/gerenciar", "/comunidades/x/gerenciar/oportunidades/nova"])("%s exige login", (p) => {
    expect(isProtectedPath(p)).toBe(true);
  });
  it.each(["/", "/oportunidades", "/comunidades", "/comunidades/x", "/talentos", "/entrar", "/painelx"])("%s é público", (p) => {
    expect(isProtectedPath(p)).toBe(false);
  });
});

describe("paginação e busca", () => {
  it("valida página", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(["2", "5"])).toBe(2);
  });
  it("neutraliza curingas e sintaxe do PostgREST", () => {
    expect(sanitizeSearch("100%_música),or(id.eq.1")).toBe("100 música or id eq 1");
    expect(sanitizeSearch("a".repeat(200))).toHaveLength(80);
  });
});
