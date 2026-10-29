import { describe, expect, it } from "vitest";
import { isNewCreator, rankFeed, scoreCandidate, type RankCandidate } from "@/lib/ranking";

const now = new Date("2026-10-29T12:00:00Z");
const old = new Date("2024-01-01T00:00:00Z");
const ctx = { now, interests: [] as string[], followingIds: new Set<string>() };

function c(p: Partial<RankCandidate> & { id: string }): RankCandidate {
  return {
    authorId: p.id,
    createdAt: new Date(now.getTime() - 3_600_000),
    categories: [],
    likeCount: 0,
    commentCount: 0,
    saveCount: 0,
    authorFollowers: 100,
    authorCreatedAt: old,
    kind: "work",
    ...p,
  };
}

describe("ranking do feed", () => {
  it("não favorece contas grandes só pelo volume: engajamento é normalizado por audiência", () => {
    const big = c({ id: "big", authorFollowers: 100_000, likeCount: 50 });
    const small = c({ id: "small", authorFollowers: 200, likeCount: 50 });
    expect(scoreCandidate(small, ctx)).toBeGreaterThan(scoreCandidate(big, ctx));
  });

  it("dá bônus explícito a novos talentos", () => {
    expect(isNewCreator({ authorFollowers: 10, authorCreatedAt: old }, now)).toBe(true);
    expect(isNewCreator({ authorFollowers: 500, authorCreatedAt: new Date(now.getTime() - 5 * 864e5) }, now)).toBe(true);
    expect(isNewCreator({ authorFollowers: 500, authorCreatedAt: old }, now)).toBe(false);
  });

  it("comentários e salvamentos pesam mais do que curtidas", () => {
    const likes = c({ id: "a", likeCount: 6 });
    const convo = c({ id: "b", commentCount: 2 });
    expect(scoreCandidate(convo, ctx)).toBeGreaterThanOrEqual(scoreCandidate(likes, ctx));
  });

  it("interesses declarados aumentam a relevância", () => {
    const match = c({ id: "m", categories: ["retrato"] });
    const other = c({ id: "o", categories: ["motion"] });
    const withInterest = { ...ctx, interests: ["retrato"] };
    expect(scoreCandidate(match, withInterest)).toBeGreaterThan(scoreCandidate(other, withInterest));
  });

  it("recência decai: o mesmo post vale menos três dias depois", () => {
    const fresh = c({ id: "f", likeCount: 10 });
    const stale = c({ id: "s", likeCount: 10, createdAt: new Date(now.getTime() - 72 * 3_600_000) });
    expect(scoreCandidate(fresh, ctx)).toBeGreaterThan(scoreCandidate(stale, ctx));
  });

  it("limita a 2 itens do mesmo autor a cada 12 (diversidade)", () => {
    const dominant = Array.from({ length: 8 }, (_, i) => c({ id: `d${i}`, authorId: "dominante", likeCount: 500, commentCount: 100 }));
    const others = Array.from({ length: 10 }, (_, i) => c({ id: `o${i}`, authorId: `autor${i}` }));
    const ranked = rankFeed([...dominant, ...others], ctx);
    const firstWindow = ranked.slice(0, 12);
    expect(firstWindow.filter((r) => r.authorId === "dominante").length).toBeLessThanOrEqual(2);
    expect(ranked).toHaveLength(18);
  });
});
