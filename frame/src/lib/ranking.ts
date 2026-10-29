/**
 * Ranking do feed "Para você".
 *
 * Princípios (documentados publicamente em /sobre/descoberta):
 * - Recência importa, mas não é tudo: meia-vida de 36 horas.
 * - Qualidade da interação > volume: comentários e salvamentos valem mais que curtidas.
 * - Engajamento é normalizado pelo tamanho da audiência do autor (log), para que
 *   perfis grandes não dominem apenas por alcance.
 * - Novos talentos recebem um bônus explícito.
 * - Interesses declarados no onboarding aumentam a relevância.
 * - Diversidade: no máximo `maxPerAuthor` itens do mesmo autor a cada janela de `window` itens.
 */

export type RankCandidate = {
  id: string;
  authorId: string;
  createdAt: Date;
  categories: string[];
  likeCount: number;
  commentCount: number;
  saveCount: number;
  authorFollowers: number;
  authorCreatedAt: Date;
  kind: string;
};

export type RankContext = {
  now: Date;
  interests: string[];
  followingIds: Set<string>;
};

const HALF_LIFE_HOURS = 36;
const NEW_CREATOR_DAYS = 45;
const NEW_CREATOR_FOLLOWERS = 50;

export function isNewCreator(c: Pick<RankCandidate, "authorFollowers" | "authorCreatedAt">, now: Date): boolean {
  const ageDays = (now.getTime() - c.authorCreatedAt.getTime()) / 86_400_000;
  return ageDays < NEW_CREATOR_DAYS || c.authorFollowers < NEW_CREATOR_FOLLOWERS;
}

export function scoreCandidate(c: RankCandidate, ctx: RankContext): number {
  const ageHours = Math.max(0, (ctx.now.getTime() - c.createdAt.getTime()) / 3_600_000);
  const recency = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);

  const weighted = c.likeCount * 1 + c.commentCount * 3 + c.saveCount * 4;
  const quality = Math.log1p(weighted) / Math.log(c.authorFollowers + 2);

  const overlap = c.categories.filter((cat) => ctx.interests.includes(cat)).length;
  const interest = ctx.interests.length > 0 ? Math.min(overlap, 3) * 0.35 : 0;

  const newTalent = isNewCreator(c, ctx.now) ? 0.4 : 0;
  const followed = ctx.followingIds.has(c.authorId) ? 0.25 : 0;
  const learning = c.kind === "tutorial" || c.kind === "showcase" ? 0.15 : 0;

  // Piso de recência evita que conteúdo bom desapareça cedo demais.
  return (0.15 + recency) * (1 + quality + interest + newTalent + followed + learning);
}

/** Ordena por score aplicando a regra de diversidade de autores. */
export function rankFeed<T extends RankCandidate>(
  candidates: T[],
  ctx: RankContext,
  opts: { maxPerAuthor?: number; window?: number } = {},
): T[] {
  const maxPerAuthor = opts.maxPerAuthor ?? 2;
  const windowSize = opts.window ?? 12;
  const sorted = candidates
    .map((c) => ({ c, s: scoreCandidate(c, ctx) }))
    .sort((a, b) => b.s - a.s || b.c.createdAt.getTime() - a.c.createdAt.getTime())
    .map((x) => x.c);

  const result: T[] = [];
  const deferred: T[] = [];
  for (const item of sorted) {
    const windowStart = Math.floor(result.length / windowSize) * windowSize;
    const inWindow = result.slice(windowStart).filter((r) => r.authorId === item.authorId).length;
    if (inWindow < maxPerAuthor) result.push(item);
    else deferred.push(item);
    // Reaproveita itens adiados assim que uma nova janela começa.
    if (result.length % windowSize === 0 && deferred.length) {
      const again = deferred.splice(0);
      for (const d of again) {
        const ws = Math.floor(result.length / windowSize) * windowSize;
        const count = result.slice(ws).filter((r) => r.authorId === d.authorId).length;
        if (count < maxPerAuthor) result.push(d);
        else deferred.push(d);
      }
    }
  }
  return result.concat(deferred);
}
