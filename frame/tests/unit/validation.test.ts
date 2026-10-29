import { describe, expect, it } from "vitest";
import { handleSchema, postSchema, profileSchema, reportSchema, safeUrl } from "@/lib/validation";
import { safeNext } from "@/lib/safe-redirect";

describe("validação de entradas", () => {
  it("aceita apenas links http(s)", () => {
    expect(safeUrl.safeParse("https://frame.app").success).toBe(true);
    expect(safeUrl.safeParse("javascript:alert(1)").success).toBe(false);
    expect(safeUrl.safeParse("data:text/html,<script>").success).toBe(false);
  });

  it("normaliza e restringe identificadores", () => {
    expect(handleSchema.parse("  Lia.Luz ")).toBe("lia.luz");
    expect(handleSchema.safeParse("ab").success).toBe(false);
    expect(handleSchema.safeParse("com espaço").success).toBe(false);
    expect(handleSchema.safeParse("admin").success).toBe(false);
  });

  it("perfil rejeita links perigosos e limita a 6", () => {
    const base = { handle: "teste", displayName: "Teste" };
    expect(profileSchema.safeParse({ ...base, links: [{ label: "x", url: "javascript:void(0)" }] }).success).toBe(false);
    const many = Array.from({ length: 7 }, (_, i) => ({ label: `l${i}`, url: `https://x.com/${i}` }));
    expect(profileSchema.safeParse({ ...base, links: many }).success).toBe(false);
  });

  it("denúncia de direitos autorais exige descrição da obra original", () => {
    expect(reportSchema.safeParse({ targetType: "post", targetId: "x", reason: "copyright", details: "curto" }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "post", targetId: "x", reason: "copyright", details: "Obra original em https://exemplo.com/minha-foto, sou o autor." }).success).toBe(true);
  });

  it("tutorial exige dados estruturados", () => {
    expect(postSchema.safeParse({ kind: "tutorial", format: "text", title: "T" }).success).toBe(false);
    const ok = postSchema.safeParse({
      kind: "tutorial",
      format: "text",
      title: "T",
      tutorial: { topic: "lightroom", level: "iniciante", durationMinutes: 5, steps: [{ title: "Passo" }] },
    });
    expect(ok.success).toBe(true);
  });

  it("evita open redirect no parâmetro next", () => {
    expect(safeNext("/p/1")).toBe("/p/1");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    // Navegadores removem tab/quebra de linha: "/\t/evil.com" viraria "//evil.com".
    expect(safeNext("/\t/evil.com")).toBe("/");
    expect(safeNext("/%09/evil.com")).toBe("/%09/evil.com");
    expect(safeNext("/\n/evil.com")).toBe("/");
    expect(safeNext("/u/lia?aba=showcases")).toBe("/u/lia?aba=showcases");
  });
});
