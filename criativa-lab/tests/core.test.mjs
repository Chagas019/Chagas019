import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStreak, computeBestStreak, levelFor, xpByDay, BADGES, LEVELS } from "../src/lib/gamification.ts";
import { CHALLENGES, challengeOfTheDay, DAILY_CHALLENGES } from "../src/lib/content/challenges.ts";
import { REFERENCES } from "../src/lib/content/references.ts";
import { COURSES } from "../src/lib/content/courses.ts";
import { generateLocalIdea } from "../src/lib/ideas/local-engine.ts";

const daysAgo = (n, base = new Date()) => {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - n, 12);
  return d.toISOString();
};

test("níveis: limites e progresso", () => {
  assert.equal(levelFor(0).level, 1);
  assert.equal(levelFor(149).level, 1);
  assert.equal(levelFor(150).level, 2);
  assert.equal(levelFor(7000).level, 9);
  assert.equal(levelFor(99999).next, null);
  const mid = levelFor(275); // entre 150 e 400
  assert.ok(mid.progress > 0.49 && mid.progress < 0.51);
  assert.equal(mid.toNext, 125);
  for (let i = 1; i < LEVELS.length; i++) assert.ok(LEVELS[i].min > LEVELS[i - 1].min);
});

test("sequência: conta dias consecutivos incluindo hoje ou ontem", () => {
  assert.equal(computeStreak([]), 0);
  assert.equal(computeStreak([{ createdAt: daysAgo(0) }, { createdAt: daysAgo(1) }, { createdAt: daysAgo(2) }]), 3);
  // Sem atividade hoje, mas ontem e anteontem: a sequência continua viva.
  assert.equal(computeStreak([{ createdAt: daysAgo(1) }, { createdAt: daysAgo(2) }]), 2);
  // Quebra de dois dias zera.
  assert.equal(computeStreak([{ createdAt: daysAgo(2) }, { createdAt: daysAgo(3) }]), 0);
  // Duas conclusões no mesmo dia contam como um dia.
  assert.equal(computeStreak([{ createdAt: daysAgo(0) }, { createdAt: daysAgo(0) }]), 1);
});

test("melhor sequência histórica", () => {
  const c = [0, 1, 2, 5, 6, 7, 8, 12].map((n) => ({ createdAt: daysAgo(n) }));
  assert.equal(computeBestStreak(c), 4);
  assert.equal(computeBestStreak([]), 0);
});

test("xpByDay agrega por dia e devolve N dias", () => {
  const acts = [
    { xp: 10, createdAt: daysAgo(0) },
    { xp: 15, createdAt: daysAgo(0) },
    { xp: 5, createdAt: daysAgo(3) },
  ];
  const week = xpByDay(acts, 7);
  assert.equal(week.length, 7);
  assert.equal(week[6].xp, 25);
  assert.equal(week[3].xp, 5);
  assert.equal(week.reduce((n, d) => n + d.xp, 0), 30);
});

test("medalhas: primeira faísca exige 1 conclusão", () => {
  const ctx = { completions: [], favorites: [], projects: [], lessons: [], activities: [], streak: 0, bestStreak: 0, xp: 0 };
  const first = BADGES.find((b) => b.id === "primeira-faisca");
  assert.equal(first.test(ctx), false);
  assert.equal(first.test({ ...ctx, completions: [{ challengeSlug: "uma-luz-so" }] }), true);
});

test("conteúdo: slugs únicos e referências válidas", () => {
  const cs = new Set(CHALLENGES.map((c) => c.slug));
  assert.equal(cs.size, CHALLENGES.length, "slugs de desafios duplicados");
  const rs = new Set(REFERENCES.map((r) => r.slug));
  assert.equal(rs.size, REFERENCES.length, "slugs de referências duplicados");
  for (const c of CHALLENGES) {
    for (const r of c.references) assert.ok(rs.has(r), `${c.slug} aponta para referência inexistente: ${r}`);
    if (c.kind !== "diario") assert.ok(c.steps?.length, `${c.slug} especial sem etapas`);
    assert.ok(c.instructions.length > 0);
  }
  for (const co of COURSES) {
    assert.ok(co.lessons.length >= 2);
    assert.equal(new Set(co.lessons.map((l) => l.slug)).size, co.lessons.length);
  }
  for (const cat of ["fotografia", "design", "video", "direcao-de-arte", "social", "tipografia", "livre"]) {
    assert.ok(DAILY_CHALLENGES.some((c) => c.category === cat), `sem desafio diário em ${cat}`);
  }
});

test("desafio do dia é determinístico e diário", () => {
  const d = new Date(2026, 10, 5);
  assert.equal(challengeOfTheDay(d).slug, challengeOfTheDay(new Date(2026, 10, 5, 23)).slug);
  assert.equal(challengeOfTheDay(d).kind, "diario");
  const next = challengeOfTheDay(new Date(2026, 10, 6));
  assert.notEqual(next.slug, challengeOfTheDay(d).slug);
});

test("motor de ideias local: completo, determinístico e com roteiro para vídeo", () => {
  const req = { what: "Reels sobre café", category: "video", style: "Retrô", audience: "Jovens", difficulty: "iniciante" };
  const a = generateLocalIdea(req);
  const b = generateLocalIdea(req);
  assert.deepEqual(a, b);
  assert.equal(a.ideas.length, 4);
  assert.ok(a.palette.every((p) => /^#[0-9A-F]{6}$/i.test(p.hex)));
  assert.ok(Array.isArray(a.script) && a.script.length >= 5);
  const poster = generateLocalIdea({ ...req, what: "Cartaz de festival", category: "design" });
  assert.equal(poster.script, null);
  assert.notDeepEqual(generateLocalIdea(req, 1).ideas, a.ideas);
});
