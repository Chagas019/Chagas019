import { describe, expect, it } from "vitest";
import { scoreMatch, MATCH_WEIGHTS, type OpportunitySignals, type VolunteerSignals } from "@/features/matching/score";
import { matchReasons } from "@/features/matching/reasons";
import { messagesFor } from "@/i18n/format";

const alice: VolunteerSignals = { skills: [1, 2], languages: ["pt", "en"], country: "BR", city: "Campinas", availability: ["weekends"] };
const opp: OpportunitySignals = { skills: [2, 3], languages: ["pt"], mode: "onsite", country: "BR", city: "campinas ", availability: ["weekends"] };

describe("Match Missionário", () => {
  it("pesos somam 100", () => {
    expect(Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("caso de referência igual ao teste SQL (75)", () => {
    const r = scoreMatch(alice, opp);
    expect(r.score).toBe(75);
    expect(r.matchedSkills).toBe(1);
    expect(r.location).toBe("same_city");
  });

  it("remoto vale localização integral mesmo em outro país", () => {
    const r = scoreMatch({ ...alice, country: "PT" }, { ...opp, mode: "remote", country: null });
    expect(r.parts.location).toBe(20);
  });

  it("presencial em outro país não pontua localização; híbrido pontua parcialmente", () => {
    expect(scoreMatch({ ...alice, country: "PT" }, opp).parts.location).toBe(0);
    expect(scoreMatch({ ...alice, country: "PT" }, { ...opp, mode: "hybrid" }).parts.location).toBe(5);
  });

  it("mesmo país, cidade diferente vale metade", () => {
    expect(scoreMatch({ ...alice, city: "Santos" }, opp).parts.location).toBe(10);
  });

  it("disponibilidade flexível é sempre compatível", () => {
    expect(scoreMatch({ ...alice, availability: ["flexible"] }, { ...opp, availability: ["weekdays"] }).availabilityMatch).toBe(true);
    expect(scoreMatch(alice, { ...opp, availability: ["weekdays"] }).availabilityMatch).toBe(false);
  });

  it("sem talentos exigidos vale metade da parte de talentos", () => {
    expect(scoreMatch(alice, { ...opp, skills: [] }).parts.skills).toBe(25);
  });

  it("match perfeito = 100 e nulo = 0", () => {
    expect(scoreMatch(alice, { ...opp, skills: [1, 2] }).score).toBe(100);
    expect(scoreMatch({ skills: [], languages: ["fr"], country: "FR", city: null, availability: [] },
      { skills: [9], languages: ["pt"], mode: "onsite", country: "BR", city: "X", availability: ["weekdays"] }).score).toBe(0);
  });

  it("modalidade preferida igual ao SQL (55 / 75 / 75)", () => {
    expect(scoreMatch({ ...alice, city: "Campinas", availability: ["flexible"], modes: ["remote"] }, { ...opp, availability: [] }).score).toBe(55);
    expect(scoreMatch({ ...alice, availability: ["flexible"], modes: [] }, { ...opp, availability: [] }).score).toBe(75);
    expect(scoreMatch({ ...alice, country: "PT", availability: ["flexible"], modes: ["remote"] }, { ...opp, mode: "remote", country: null, availability: [] }).score).toBe(75);
  });

  it("gera explicações legíveis", () => {
    const reasons = matchReasons(scoreMatch(alice, opp), messagesFor("pt-BR"));
    expect(reasons.map((r) => r.text)).toEqual(["Talentos: 1 de 2", "Idioma em comum", "Na sua cidade", "Compatível com sua disponibilidade"]);
  });
});
