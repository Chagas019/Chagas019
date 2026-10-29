import { describe, expect, it } from "vitest";
import { extractHashtags, extractMentions, tokenize } from "@/lib/text";

describe("hashtags e menções", () => {
  it("extrai hashtags normalizadas, sem duplicar e sem números puros", () => {
    expect(extractHashtags("Ensaio #RetratO na #luzNatural #retrato #2024 a#b", "#Fotografia")).toEqual(["retrato", "luznatural", "fotografia"]);
  });
  it("aceita acentos", () => {
    expect(extractHashtags("#edição #coração")).toEqual(["edição", "coração"]);
  });
  it("extrai menções válidas e ignora e-mails", () => {
    expect(extractMentions("valeu @lia.moreira e @caio_b! contato: a@b.com @ab")).toEqual(["lia.moreira", "caio_b"]);
  });
  it("tokeniza texto preservando o conteúdo", () => {
    const parts = tokenize("Oi @lia, veja #Cor.");
    expect(parts).toEqual([
      { type: "text", value: "Oi " },
      { type: "mention", value: "lia" },
      { type: "text", value: ", veja " },
      { type: "tag", value: "cor" },
      { type: "text", value: "." },
    ]);
  });
  it("não transforma HTML em marcação", () => {
    const parts = tokenize("<script>#x1</script>");
    expect(parts.map((p) => p.value).join("")).toContain("<script>");
  });
});
