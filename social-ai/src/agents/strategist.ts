import { z } from 'zod';
import { getDb } from '../db/db.js';
import { getBrand, getSettings } from '../db/repo.js';
import { getLLM } from '../integrations/llm/provider.js';
import { addDays } from '../lib/time.js';
import { allocateCalendar, findConsecutiveRepeats } from './calendar.js';
import { getMemory, runAgent } from './base.js';

const ThemesSchema = z.object({
  items: z.array(z.object({ date: z.string(), slot: z.string(), theme: z.string(), notes: z.string() })),
});

const BriefSchema = z.object({
  briefs: z.array(z.object({
    slot: z.string(),
    title: z.string(),
    theme: z.string(),
    objective: z.enum(['alcance', 'engajamento', 'salvamentos', 'compartilhamentos', 'autoridade', 'comunidade', 'seguidores']),
    audience: z.string(),
    hook: z.string(),
    cta: z.string(),
    suggested_time: z.string().regex(/^\d{2}:\d{2}$/),
    rationale: z.string(),
    trend_title: z.string().nullable(),
  })),
});

function recentThemes(days = 45) {
  return getDb().all<{ date: string; theme: string }>(
    `SELECT date, theme FROM editorial_calendar WHERE theme IS NOT NULL AND date >= date('now', ?) ORDER BY date`, `-${days} days`,
  );
}

/** Cria/atualiza o calendário editorial de N dias (padrão 30). Não sobrescreve itens já em produção. */
export async function buildCalendar(startDate: string, days = 30, jobId?: number) {
  return runAgent('strategist', { startDate, days }, async (ctx) => {
    const s = getSettings();
    const db = getDb();
    const prevRows = db.all(`SELECT slot, pillar FROM editorial_calendar WHERE date = ?`, addDays(startDate, -1));
    const plan = allocateCalendar({
      startDate, days, pillars: s.pillars,
      reelsPerDay: s.frequency.reels_per_day, feedPerDay: s.frequency.feed_per_day,
      times: s.publish_times,
      previous: Object.fromEntries(prevRows.filter((r) => r.slot !== 'stories').map((r) => [r.slot, r.pillar])),
      startIndex: Math.floor(Date.parse(startDate) / 86400000),
    });
    const brand = getBrand();
    const trends = db.all(`SELECT title, topic, format, momentum, adaptation_potential FROM trends WHERE report_date >= date(?, '-7 days') ORDER BY adaptation_potential DESC LIMIT 25`, startDate);
    const recs = getMemory('strategist').analyst_recommendations ?? [];
    const pillarLabel = Object.fromEntries(s.pillars.map((p) => [p.key, p.label]));

    const ask = async (slots: typeof plan, extra = '') => {
      const res = await getLLM().json({
        system: ctx.instructions,
        schema: ThemesSchema,
        prompt: `Nicho: ${brand.niche}. Público: ${brand.audience ?? 'criadores brasileiros'}.
Tendências recentes: ${JSON.stringify(trends)}
Recomendações do Analyst (hipóteses): ${JSON.stringify(recs)}
Temas já usados recentemente (não repetir): ${JSON.stringify(recentThemes().map((r) => r.theme))}
${extra}
Defina um tema específico e original (não genérico) para cada slot abaixo, respeitando o pilar e o formato.
Nunca repita o mesmo assunto em dias consecutivos. Stories devem apoiar o conteúdo principal do dia com interação.
Slots: ${JSON.stringify(slots.map((p) => ({ date: p.date, slot: p.slot, format: p.format, pillar: pillarLabel[p.pillar] ?? p.pillar })))}`,
      });
      ctx.addUsage(res.usage);
      return res.data.items;
    };

    let themed = await ask(plan);
    const merged = () => plan.map((p) => ({ ...p, theme: themed.find((t) => t.date === p.date && t.slot === p.slot)?.theme ?? '', notes: themed.find((t) => t.date === p.date && t.slot === p.slot)?.notes ?? '' }));
    let items = merged();
    const conflicts = findConsecutiveRepeats(items);
    if (conflicts.length) {
      ctx.log('warn', `${conflicts.length} temas repetidos em dias consecutivos — solicitando correção`);
      const toFix = plan.filter((p) => conflicts.some((c) => c.b.date === p.date && c.b.slot === p.slot));
      const fixed = await ask(toFix, `Estes temas conflitam com o dia anterior: ${JSON.stringify(conflicts.map((c) => ({ anterior: c.a.theme, atual: c.b.theme })))}. Proponha temas diferentes.`);
      themed = [...themed.filter((t) => !fixed.some((f) => f.date === t.date && f.slot === t.slot)), ...fixed];
      items = merged();
    }

    let written = 0;
    db.tx(() => {
      for (const it of items) {
        const r = db.run(
          `INSERT INTO editorial_calendar (date, slot, scheduled_time, format, pillar, theme, notes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'planned')
           ON CONFLICT(date, slot) DO UPDATE SET format=excluded.format, pillar=excluded.pillar, theme=excluded.theme,
             notes=excluded.notes, scheduled_time=excluded.scheduled_time
           WHERE editorial_calendar.status = 'planned' AND editorial_calendar.project_id IS NULL`,
          it.date, it.slot, it.time, it.format, it.pillar, it.theme || null, it.notes || null,
        );
        written += r.changes;
      }
    });
    return { days, slots: items.length, written, remainingConflicts: findConsecutiveRepeats(items).length };
  }, jobId);
}

/** 08:00 — Estratégia do dia: transforma os slots do calendário em pautas completas (content_ideas). */
export async function dailyStrategy(date: string, jobId?: number) {
  return runAgent('strategist', { date, step: 'daily' }, async (ctx) => {
    const db = getDb();
    let slots = db.all(`SELECT * FROM editorial_calendar WHERE date = ? AND content_idea_id IS NULL`, date);
    if (!db.get(`SELECT 1 FROM editorial_calendar WHERE date = ?`, date)) {
      ctx.log('info', 'Dia sem calendário — gerando calendário de 30 dias');
      await buildCalendar(date, 30, jobId);
      slots = db.all(`SELECT * FROM editorial_calendar WHERE date = ? AND content_idea_id IS NULL`, date);
    }
    if (!slots.length) return { created: 0, note: 'Pautas do dia já definidas' };
    const brand = getBrand();
    const s = getSettings();
    const report = db.get(`SELECT summary, data FROM daily_reports WHERE type='trends' AND period_start = ?`, date);
    const trends = db.all(`SELECT id, title, summary, format, hook_pattern, narrative_structure, cta_pattern, momentum FROM trends WHERE report_date = ? ORDER BY adaptation_potential DESC LIMIT 12`, date);
    const recs = getMemory('strategist').analyst_recommendations ?? [];
    const res = await getLLM().json({
      system: ctx.instructions,
      schema: BriefSchema,
      prompt: `Data: ${date}. Nicho: ${brand.niche}. Tom de voz: ${brand.tone}.
Janela de publicação: ${s.publish_window.start}–${s.publish_window.end}.
Relatório de tendências: ${report?.summary ?? 'indisponível'}
Tendências do dia: ${JSON.stringify(trends)}
Recomendações do Analyst: ${JSON.stringify(recs)}
Para cada slot, crie a pauta completa: tema, objetivo, público-alvo, gancho, CTA, horário sugerido e justificativa estratégica.
Se uma tendência inspirar a pauta, informe o título dela em trend_title (adaptação original, nunca cópia).
Slots: ${JSON.stringify(slots.map((x) => ({ slot: x.slot, format: x.format, pillar: x.pillar, theme: x.theme, horario_padrao: x.scheduled_time })))}`,
    });
    ctx.addUsage(res.usage);
    let created = 0;
    db.tx(() => {
      for (const b of res.data.briefs) {
        const slot = slots.find((x) => x.slot === b.slot);
        if (!slot) continue;
        const trendId = b.trend_title ? trends.find((t) => t.title === b.trend_title)?.id ?? null : null;
        const idea = db.run(
          `INSERT INTO content_ideas (trend_id, title, theme, pillar, objective, format, audience, hook, cta, suggested_time, rationale)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          trendId, b.title, b.theme, slot.pillar, b.objective, slot.format, b.audience, b.hook, b.cta, b.suggested_time, b.rationale,
        );
        const inWindow = b.suggested_time >= s.publish_window.start && b.suggested_time <= s.publish_window.end;
        db.run(`UPDATE editorial_calendar SET content_idea_id=?, theme=?, scheduled_time=?, status='briefed' WHERE id=?`,
          idea.lastId, b.theme, inWindow && slot.slot !== 'stories' ? b.suggested_time : slot.scheduled_time, slot.id);
        created++;
      }
    });
    return { created };
  }, jobId);
}
