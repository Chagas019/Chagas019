// Gera supabase/seed.sql a partir do conteúdo em src/lib/content (fonte única da verdade).
// Uso: npm run db:seed  (requer Node 22.18+ para importar arquivos .ts)
import { writeFileSync } from "node:fs";
import { CHALLENGES } from "../src/lib/content/challenges.ts";
import { REFERENCES } from "../src/lib/content/references.ts";
import { COURSES } from "../src/lib/content/courses.ts";

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a ? `array[${a.map(q).join(",")}]::text[]` : "null");

const out = ["-- Gerado automaticamente por scripts/generate-seed.mjs — não edite à mão.", "begin;"];

for (const c of CHALLENGES) {
  out.push(
    `insert into public.challenges (slug,title,category,kind,difficulty,minutes,xp,summary,objective,instructions,steps,reference_slugs,tags) values (${[
      q(c.slug), q(c.title), q(c.category), q(c.kind), q(c.difficulty), c.minutes, c.xp, q(c.summary), q(c.objective),
      arr(c.instructions), arr(c.steps), arr(c.references), arr(c.tags),
    ].join(",")}) on conflict (slug) do update set title=excluded.title, category=excluded.category, kind=excluded.kind, difficulty=excluded.difficulty, minutes=excluded.minutes, xp=excluded.xp, summary=excluded.summary, objective=excluded.objective, instructions=excluded.instructions, steps=excluded.steps, reference_slugs=excluded.reference_slugs, tags=excluded.tags;`,
  );
}
for (const r of REFERENCES) {
  out.push(
    `insert into public.creative_references (slug,title,kind,author,year,description,insight,palette,tags,seed,ratio) values (${[
      q(r.slug), q(r.title), q(r.kind), q(r.author), r.year, q(r.description), q(r.insight), arr(r.palette), arr(r.tags), r.seed, q(r.ratio),
    ].join(",")}) on conflict (slug) do update set title=excluded.title, kind=excluded.kind, author=excluded.author, year=excluded.year, description=excluded.description, insight=excluded.insight, palette=excluded.palette, tags=excluded.tags, seed=excluded.seed, ratio=excluded.ratio;`,
  );
}
COURSES.forEach((c, i) => {
  out.push(
    `insert into public.courses (slug,title,subtitle,category,level,color,position) values (${[q(c.slug), q(c.title), q(c.subtitle), q(c.category), q(c.level), q(c.color), i].join(",")}) on conflict (slug) do update set title=excluded.title, subtitle=excluded.subtitle, category=excluded.category, level=excluded.level, color=excluded.color, position=excluded.position;`,
  );
  c.lessons.forEach((l, j) => {
    out.push(
      `insert into public.lessons (course_slug,slug,title,minutes,body,exercise,position) values (${[q(c.slug), q(l.slug), q(l.title), l.minutes, arr(l.body), q(l.exercise), j].join(",")}) on conflict (course_slug,slug) do update set title=excluded.title, minutes=excluded.minutes, body=excluded.body, exercise=excluded.exercise, position=excluded.position;`,
    );
  });
});
out.push("commit;", "");
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out.join("\n"));
console.log(`seed.sql: ${CHALLENGES.length} desafios, ${REFERENCES.length} referências, ${COURSES.length} cursos.`);
