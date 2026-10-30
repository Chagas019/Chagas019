import { describe, expect, it } from "vitest";
import { challengePhase } from "@/server/services/challenges";

const d = (h: number) => new Date(Date.UTC(2026, 9, 29, 12) + h * 3_600_000);
const base = { startsAt: d(0), submissionDeadline: d(48), votingEnabled: true, votingEndsAt: d(96) };

describe("fases do desafio", () => {
  it("segue upcoming → open → voting → closed", () => {
    expect(challengePhase(base, d(-1))).toBe("upcoming");
    expect(challengePhase(base, d(1))).toBe("open");
    expect(challengePhase(base, d(50))).toBe("voting");
    expect(challengePhase(base, d(100))).toBe("closed");
  });
  it("sem votação, encerra no fim dos envios", () => {
    expect(challengePhase({ ...base, votingEnabled: false }, d(50))).toBe("closed");
  });
});
