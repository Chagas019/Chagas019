import { z } from 'zod';
import { getDb } from '../db/db.js';
import { getBrand, getSettings } from '../db/repo.js';
import { getLLM } from '../integrations/llm/provider.js';
import { buildCaption, checkCopy } from '../quality/copy.js';
import { runAgent } from './base.js';

export const CopySchema = z.object({
  title: z.string(),
  hook: z.string(),
  caption_body: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
  cover_title: z.string(),
  kicker: z.string(),
  reel_script: z.object({
    duration_seconds: z.number(),
    scenes: z.array(z.object({
      start: z.number(), end: z.number(),
      on_screen_text: z.string(),
      emphasis: z.string().nullable(),
      voiceover: z.string(),
      visual_direction: z.string(),
    })),
  }).nullable(),
  carousel_slides: z.array(z.object({ title: z.string(), body: z.string() })).nullable(),
  image: z.object({ headline: z.string(), subheadline: z.string() }).nullable(),
  stories: z.array(z.object({ text: z.string(), kicker: z.string().nullable(), interaction_prompt: z.string().nullable() })).nullable(),
  visual_prompt: z.string(),
});
export type Copy = z.infer<typeof CopySchema>;

const FORMAT_RULES: Record<string, string> = {
  REELS: 'Preencha reel_script com 4 a 7 cenas, total de 15 a 45 segundos. A primeira cena (0–3s) é o gancho visual. on_screen_text curto (máx. 9 palavras). carousel_slides, image e stories = null.',
  CAROUSEL: 'Preencha carousel_slides com 6 a 9 slides: o 1º é a capa (título forte), os do meio entregam o conteúdo (1 ideia por slide, body até 220 caracteres), o último é o CTA de salvar/compartilhar. reel_script, image e stories = null.',
  IMAGE: 'Preencha image com headline (máx. 10 palavras) e subheadline (máx. 22 palavras). reel_script, carousel_slides e stories = null.',
  STORIES: 'Preencha stories com 3 a 5 telas em sequência (abertura, valor, interação, CTA). interaction_prompt é uma pergunta ou enquete escrita na arte (stickers interativos não são suportados pela API). caption_body pode ser curto; hashtags pode ser vazio. reel_script, carousel_slides e image = null.',
};

/** 09:00 — Gera textos e roteiros para todas as pautas do dia ainda sem projeto. */
export async function writeDay(date: string, jobId?: number) {
  return runAgent('copywriter', { date }, async (ctx) => {
    const db = getDb();
    const rows = db.all(
      `SELECT c.id cal_id, c.slot, c.format, c.pillar, i.* FROM editorial_calendar c JOIN content_ideas i ON i.id = c.content_idea_id
       WHERE c.date = ? AND c.project_id IS NULL`, date,
    );
    const brand = getBrand();
    const s = getSettings();
    const rules = { maxHashtags: s.publishing_rules.max_hashtags, maxLength: s.publishing_rules.max_caption_length, forbidden: [...brand.forbidden_words, ...s.publishing_rules.blocked_terms] };
    const results: { projectId: number; format: string; issues: number }[] = [];

    for (const r of rows) {
      const base = `Marca: ${brand.brand_name}${brand.handle ? ` (@${brand.handle})` : ''}. Nicho: ${brand.niche}. Tom de voz: ${brand.tone}.
Regras da marca: ${brand.rules.join(' | ')}
Hashtags-base da marca (use as relevantes): ${brand.base_hashtags.join(', ')}
Pauta: ${JSON.stringify({ titulo: r.title, tema: r.theme, objetivo: r.objective, formato: r.format, publico: r.audience, gancho_sugerido: r.hook, cta: r.cta, justificativa: r.rationale })}
${FORMAT_RULES[r.format]}
Legenda: gancho na 1ª linha, corpo com valor real e específico, CTA único. Hashtags sem '#', 5 a 12.
kicker: rótulo curto do pilar para a arte (1–2 palavras). visual_prompt: descrição de uma imagem ORIGINAL, sem texto, que ilustre o tema (para geração de imagem).`;
      let res = await getLLM().json({ system: ctx.instructions, schema: CopySchema, prompt: base });
      ctx.addUsage(res.usage);
      let copy = res.data;
      let full = buildCaption({ hook: copy.hook, body: copy.caption_body, cta: copy.cta, hashtags: copy.hashtags });
      let issues = [...structureIssues(r.format, copy), ...checkCopy({ hook: copy.hook, body: copy.caption_body, cta: copy.cta, hashtags: copy.hashtags, fullText: full }, rules)];
      if (issues.some((i) => i.severity !== 'minor')) {
        ctx.log('warn', `Copy reprovada na revisão (${issues.map((i) => i.code).join(',')}); reescrevendo`);
        res = await getLLM().json({ system: ctx.instructions, schema: CopySchema, prompt: `${base}\n\nA versão anterior foi reprovada por: ${issues.map((i) => i.message).join('; ')}. Reescreva corrigindo.` });
        ctx.addUsage(res.usage);
        copy = res.data;
        full = buildCaption({ hook: copy.hook, body: copy.caption_body, cta: copy.cta, hashtags: copy.hashtags });
        issues = [...structureIssues(r.format, copy), ...checkCopy({ hook: copy.hook, body: copy.caption_body, cta: copy.cta, hashtags: copy.hashtags, fullText: full }, rules)];
      }
      if (structureIssues(r.format, copy).length) {
        ctx.log('error', `Copy estruturalmente inválida para ${r.format} após nova tentativa; pauta #${r.id} ignorada`);
        continue;
      }
      const projectId = saveCopy(r.cal_id, r.id, r.format, copy, full, issues);
      results.push({ projectId, format: r.format, issues: issues.length });
    }
    return { projects: results };
  }, jobId);
}

/** Validação estrutural por formato (o schema permite null; o formato exige o bloco certo). */
export function structureIssues(format: string, c: Copy) {
  const out: { code: string; severity: 'critical'; message: string }[] = [];
  const bad = (m: string) => out.push({ code: 'structure', severity: 'critical', message: m });
  if (format === 'REELS' && !(c.reel_script?.scenes?.length)) bad('Reel sem cenas no roteiro');
  if (format === 'CAROUSEL' && !(c.carousel_slides && c.carousel_slides.length >= 2 && c.carousel_slides.length <= 10)) bad('Carrossel precisa de 2 a 10 slides');
  if (format === 'IMAGE' && !c.image?.headline) bad('Imagem sem headline');
  if (format === 'STORIES' && !(c.stories && c.stories.length >= 1)) bad('Sequência de stories vazia');
  return out;
}

export function saveCopy(calendarId: number, ideaId: number, format: string, copy: Copy, fullText: string, issues: unknown[]) {
  const db = getDb();
  return db.tx(() => {
    const p = db.run(
      `INSERT INTO content_projects (calendar_id, idea_id, format, title, status, script, slides, stories, quality_report)
       VALUES (?, ?, ?, ?, 'copy_ready', ?, ?, ?, ?)`,
      calendarId, ideaId, format, copy.title,
      JSON.stringify({ ...(copy.reel_script ?? {}), cover_title: copy.cover_title, kicker: copy.kicker, image: copy.image, visual_prompt: copy.visual_prompt }),
      JSON.stringify(copy.carousel_slides ?? []), JSON.stringify(copy.stories ?? []), JSON.stringify({ copy: issues }),
    );
    db.run(
      `INSERT INTO captions (project_id, version, title, hook, body, cta, hashtags, full_text) VALUES (?, 1, ?, ?, ?, ?, ?, ?)`,
      p.lastId, copy.title, copy.hook, copy.caption_body, copy.cta, JSON.stringify(copy.hashtags), fullText,
    );
    db.run(`UPDATE editorial_calendar SET project_id=?, status='in_production' WHERE id=?`, p.lastId, calendarId);
    return p.lastId;
  });
}

export function latestCaption(projectId: number) {
  return getDb().get('SELECT * FROM captions WHERE project_id = ? ORDER BY version DESC LIMIT 1', projectId);
}

/** Nova versão de legenda (edição manual no painel). Mantém histórico. */
export function saveCaptionVersion(projectId: number, c: { hook?: string; body: string; cta?: string; hashtags: string[] }, author: string) {
  const db = getDb();
  const v = (db.get<{ v: number }>('SELECT COALESCE(MAX(version),0) v FROM captions WHERE project_id=?', projectId)!.v ?? 0) + 1;
  const full = buildCaption(c);
  const title = latestCaption(projectId)?.title ?? null;
  db.run(
    `INSERT INTO captions (project_id, version, title, hook, body, cta, hashtags, full_text, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    projectId, v, title, c.hook ?? null, c.body, c.cta ?? null, JSON.stringify(c.hashtags), full, author,
  );
  return latestCaption(projectId);
}
