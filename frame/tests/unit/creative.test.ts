import { describe, expect, it } from "vitest";
import { generateIdea, IDEA_OPTIONS, isValidInputs } from "@/lib/creative/ideas";
import { dailyPrompt, dailyTag, DAILY_PROMPTS } from "@/lib/creative/daily";
import { EXAMPLES } from "@/lib/creative/examples";
import { ideaProposalSchema } from "@/lib/validation";
import { extractHashtags } from "@/lib/text";
import { CATEGORY_SLUGS } from "@/lib/taxonomy";

const inputs = { kind: "video", goal: "ensinar", style: "vibrante", platform: "reels", time: "30min" };

describe("gerador de ideias", () => {
  it("é determinístico pela semente e varia com ela", () => {
    expect(generateIdea(inputs, 42)).toEqual(generateIdea(inputs, 42));
    const titles = new Set(Array.from({ length: 20 }, (_, i) => generateIdea(inputs, i + 1).title));
    expect(titles.size).toBeGreaterThan(3);
  });
  it("toda combinação gera uma proposta válida para salvar", () => {
    for (const kind of IDEA_OPTIONS.kind)
      for (const style of IDEA_OPTIONS.style) {
        const p = generateIdea({ ...inputs, kind: kind.v, style: style.v }, 7);
        expect(ideaProposalSchema.safeParse(p).success).toBe(true);
        expect(p.structure.length).toBeGreaterThan(2);
      }
  });
  it("Reels pede vertical", () => {
    expect(generateIdea(inputs, 3).framing).toMatch(/9:16/);
    expect(isValidInputs(inputs)).toBe(true);
    expect(isValidInputs({ ...inputs, kind: "hack" })).toBe(false);
  });
});

describe("desafio do dia e laboratório", () => {
  it("troca de tema a cada dia e gera hashtags válidas", () => {
    const a = dailyPrompt(new Date("2026-10-29T12:00:00Z"));
    const b = dailyPrompt(new Date("2026-10-30T12:00:00Z"));
    expect(a.slug).not.toBe(b.slug);
    for (const p of DAILY_PROMPTS) expect(extractHashtags(`#desafiodiario #${dailyTag(p)}`)).toEqual(["desafiodiario", dailyTag(p)]);
  });
  it("exemplos têm slugs únicos, passos e categoria existente", () => {
    expect(new Set(EXAMPLES.map((e) => e.slug)).size).toBe(EXAMPLES.length);
    for (const e of EXAMPLES) {
      expect(e.steps.length).toBeGreaterThanOrEqual(4);
      expect(CATEGORY_SLUGS).toContain(e.category);
    }
  });
});
