import { z } from 'zod';
import { getDb, json } from '../db/db.js';
import { getActiveAccount, getSettings } from '../db/repo.js';
import { graphClientFor } from '../integrations/instagram/account.js';
import { metricsFor } from '../integrations/instagram/graph.js';
import { getLLM } from '../integrations/llm/provider.js';
import { IntegrationUnavailableError } from '../lib/errors.js';
import { addDays, todayIn } from '../lib/time.js';
import { runAgent, setMemory } from './base.js';

export interface MetricRow {
  publication_id: number; media_type: string; pillar: string | null; title: string; permalink: string | null; published_at: string;
  reach: number; views: number; likes: number; comments: number; shares: number; saved: number; total_interactions: number;
}

/** Pontuação de engajamento ponderada (salvar/compartilhar valem mais que curtir). */
export function engagementScore(m: Pick<MetricRow, 'reach' | 'likes' | 'comments' | 'shares' | 'saved'>) {
  const weighted = (m.likes ?? 0) + 2 * (m.comments ?? 0) + 3 * (m.shares ?? 0) + 3 * (m.saved ?? 0);
  return m.reach ? weighted / m.reach : 0;
}

export function engagementRate(m: Pick<MetricRow, 'reach' | 'likes' | 'comments' | 'shares' | 'saved'>) {
  const i = (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saved ?? 0);
  return m.reach ? i / m.reach : 0;
}

/** Última coleta de cada publicação no período. */
export function latestMetrics(from: string, to: string): MetricRow[] {
  return getDb().all<MetricRow>(
    `SELECT p.id publication_id, p.media_type, c.pillar, pr.title, p.permalink, p.published_at,
            COALESCE(m.reach,0) reach, COALESCE(m.views,0) views, COALESCE(m.likes,0) likes, COALESCE(m.comments,0) comments,
            COALESCE(m.shares,0) shares, COALESCE(m.saved,0) saved, COALESCE(m.total_interactions,0) total_interactions
     FROM publications p
     JOIN content_projects pr ON pr.id = p.project_id
     LEFT JOIN editorial_calendar c ON c.id = pr.calendar_id
     JOIN publication_metrics m ON m.id = (SELECT id FROM publication_metrics WHERE publication_id = p.id ORDER BY collected_at DESC, id DESC LIMIT 1)
     WHERE p.status = 'published' AND date(p.published_at) BETWEEN ? AND ?`,
    from, to,
  );
}

export function topContents(rows: MetricRow[], n = 5) {
  return [...rows].map((r) => ({ ...r, score: engagementScore(r), engagement_rate: engagementRate(r) })).sort((a, b) => b.score - a.score).slice(0, n);
}

/** Desempenho por grupo, com tamanho de amostra e aviso de baixa confiança. */
export function groupPerformance(rows: MetricRow[], key: 'media_type' | 'pillar') {
  const groups: Record<string, MetricRow[]> = {};
  for (const r of rows) (groups[String(r[key] ?? 'n/d')] ??= []).push(r);
  return Object.entries(groups).map(([k, list]) => {
    const n = list.length;
    const avg = (f: (r: MetricRow) => number) => list.reduce((a, r) => a + f(r), 0) / n;
    const rates = list.map(engagementRate);
    const mean = avg(engagementRate);
    const sd = Math.sqrt(rates.reduce((a, x) => a + (x - mean) ** 2, 0) / Math.max(1, n - 1));
    return {
      group: k, n,
      avgReach: Math.round(avg((r) => r.reach)),
      avgEngagementRate: mean,
      stdev: sd,
      avgSaves: avg((r) => r.saved),
      avgShares: avg((r) => r.shares),
      confidence: n >= 10 ? 'moderada' : n >= 5 ? 'baixa' : 'insuficiente',
    };
  }).sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
}

/** Coleta métricas de uma publicação pela API oficial. */
export async function collectOne(publicationId: number, jobId?: number) {
  return runAgent('analyst', { publicationId }, async () => {
    const db = getDb();
    const pub = db.get('SELECT * FROM publications WHERE id = ?', publicationId);
    if (!pub?.ig_media_id) return { skipped: true };
    const client = graphClientFor();
    const m = await client.mediaInsights(pub.ig_media_id, metricsFor(pub.media_type));
    const info: any = await client.mediaInfo(pub.ig_media_id).catch(() => ({}));
    db.run(
      `INSERT INTO publication_metrics (publication_id, reach, views, likes, comments, shares, saved, total_interactions, profile_visits, follows, avg_watch_time_ms, raw)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      publicationId, m.reach ?? null, m.views ?? null, m.likes ?? info.like_count ?? null, m.comments ?? info.comments_count ?? null,
      m.shares ?? null, m.saved ?? null, m.total_interactions ?? null, m.profile_visits ?? null, m.follows ?? null,
      m.ig_reels_avg_watch_time ?? null, JSON.stringify(m),
    );
    return { publicationId, metrics: m };
  }, jobId);
}

const InsightSchema = z.object({
  summary: z.string(),
  recommendations: z.array(z.object({ hypothesis: z.string(), action: z.string(), evidence: z.string(), confidence: z.enum(['baixa', 'moderada', 'alta']) })),
  caveats: z.string(),
});

/** Noite — coleta métricas recentes, snapshot da conta e relatório diário (e semanal aos domingos). */
export async function nightlyAnalysis(date: string, jobId?: number) {
  return runAgent('analyst', { date }, async (ctx) => {
    const db = getDb();
    const acc = getActiveAccount();
    if (!acc) throw new IntegrationUnavailableError('instagram', 'Conta não conectada — sem métricas reais para coletar.');
    const client = graphClientFor(acc);

    const pubs = db.all(`SELECT * FROM publications WHERE status='published' AND ig_media_id IS NOT NULL AND published_at >= datetime('now','-30 days')`);
    let collected = 0;
    for (const p of pubs) {
      try {
        const m = await client.mediaInsights(p.ig_media_id, metricsFor(p.media_type));
        db.run(
          `INSERT INTO publication_metrics (publication_id, reach, views, likes, comments, shares, saved, total_interactions, profile_visits, follows, avg_watch_time_ms, raw)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          p.id, m.reach ?? null, m.views ?? null, m.likes ?? null, m.comments ?? null, m.shares ?? null, m.saved ?? null,
          m.total_interactions ?? null, m.profile_visits ?? null, m.follows ?? null, m.ig_reels_avg_watch_time ?? null, JSON.stringify(m),
        );
        collected++;
      } catch (e: any) {
        ctx.log('warn', `Métricas indisponíveis para publicação #${p.id}: ${e.message}`);
      }
    }

    const profile: any = await client.account(acc.ig_user_id);
    const accIns = await client.accountInsights(acc.ig_user_id, ['reach', 'profile_views', 'accounts_engaged']);
    db.run(
      `INSERT INTO account_snapshots (account_id, date, followers_count, media_count, reach, profile_views, raw) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(account_id, date) DO UPDATE SET followers_count=excluded.followers_count, media_count=excluded.media_count,
         reach=excluded.reach, profile_views=excluded.profile_views, raw=excluded.raw`,
      acc.id, date, profile.followers_count ?? null, profile.media_count ?? null, accIns.reach ?? null, accIns.profile_views ?? null, JSON.stringify(accIns),
    );
    db.run(`UPDATE instagram_accounts SET followers_count=?, media_count=? WHERE id=?`, profile.followers_count ?? null, profile.media_count ?? null, acc.id);

    const daily = await buildReport('daily', date, date, ctx);
    let weekly = null;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === getSettings().routine.weekly_report_weekday) weekly = await buildReport('weekly', addDays(date, -6), date, ctx);
    return { collected, daily: daily.summary, weekly: weekly?.summary ?? null };
  }, jobId);
}

export async function buildReport(type: 'daily' | 'weekly', from: string, to: string, ctx: { addUsage: (u: any) => void; log: (...a: any[]) => void }) {
  const db = getDb();
  const window = type === 'daily' ? latestMetrics(addDays(to, -29), to) : latestMetrics(from, to);
  const period = latestMetrics(from, to);
  const top5 = topContents(window, 5);
  const byFormat = groupPerformance(window, 'media_type');
  const byPillar = groupPerformance(window, 'pillar');
  const snaps = db.all(`SELECT date, followers_count FROM account_snapshots WHERE date BETWEEN ? AND ? ORDER BY date`, addDays(from, -1), to);
  const growth = snaps.length >= 2 ? (snaps[snaps.length - 1].followers_count ?? 0) - (snaps[0].followers_count ?? 0) : null;
  const totals = period.reduce((a, r) => ({ reach: a.reach + r.reach, interactions: a.interactions + r.likes + r.comments + r.shares + r.saved, posts: a.posts + 1 }), { reach: 0, interactions: 0, posts: 0 });

  let summary = `${totals.posts} publicações no período, alcance somado ${totals.reach}, ${totals.interactions} interações.`;
  let recommendations: any[] = [];
  let caveats = window.length < 10 ? `Amostra pequena (${window.length} publicações): trate padrões como hipóteses.` : '';
  if (window.length) {
    try {
      const res = await getLLM().json({
        system: (db.get(`SELECT instructions FROM agents WHERE key='analyst'`) as any).instructions,
        schema: InsightSchema,
        prompt: `Relatório ${type} de ${from} a ${to}.
Totais do período: ${JSON.stringify(totals)}. Crescimento de seguidores: ${growth ?? 'sem dados'}.
Top 5 (janela de análise): ${JSON.stringify(top5.map((t) => ({ titulo: t.title, formato: t.media_type, pilar: t.pillar, alcance: t.reach, salvamentos: t.saved, compartilhamentos: t.shares, taxa: t.engagement_rate.toFixed(4) })))}
Por formato: ${JSON.stringify(byFormat)}
Por pilar: ${JSON.stringify(byPillar)}
Gere recomendações para o Strategist como HIPÓTESES testáveis, citando a evidência e o tamanho da amostra. Não confunda correlação com causalidade.`,
      });
      ctx.addUsage(res.usage);
      summary = res.data.summary;
      recommendations = res.data.recommendations;
      caveats = res.data.caveats || caveats;
    } catch (e: any) {
      ctx.log('warn', `Resumo por IA indisponível (${e.message}); relatório só com dados`);
      recommendations = byFormat.filter((f) => f.n >= 5).slice(0, 1).map((f) => ({
        hypothesis: `${f.group} tem a maior taxa média de engajamento (${(f.avgEngagementRate * 100).toFixed(2)}%, n=${f.n}).`,
        action: `Testar +1 conteúdo ${f.group} por semana e comparar.`, evidence: `n=${f.n}, desvio ${f.stdev.toFixed(4)}`, confidence: 'baixa',
      }));
    }
  }

  const data = { totals, growth, top5, byFormat, byPillar, recommendations, caveats, sample: window.length };
  db.run(
    `INSERT INTO daily_reports (type, period_start, period_end, summary, data) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(type, period_start) DO UPDATE SET period_end=excluded.period_end, summary=excluded.summary, data=excluded.data, created_at=datetime('now')`,
    type, from, to, summary, JSON.stringify(data),
  );
  // Retroalimentação: Analyst → Strategist
  setMemory('strategist', 'analyst_recommendations', recommendations);
  setMemory('analyst', 'format_performance', Object.fromEntries(byFormat.map((f) => [f.group, { avgEngagement: f.avgEngagementRate, n: f.n }])));
  return { summary, data };
}

export function analyticsSummary(days = 30) {
  const tz = getSettings().timezone;
  const to = todayIn(tz);
  const from = addDays(to, -(days - 1));
  const rows = latestMetrics(from, to);
  const db = getDb();
  const series = db.all(
    `SELECT date(p.published_at) day, SUM(COALESCE(m.reach,0)) reach,
            SUM(COALESCE(m.likes,0)+COALESCE(m.comments,0)+COALESCE(m.shares,0)+COALESCE(m.saved,0)) interactions
     FROM publications p JOIN publication_metrics m ON m.id = (SELECT id FROM publication_metrics WHERE publication_id=p.id ORDER BY collected_at DESC, id DESC LIMIT 1)
     WHERE p.status='published' AND date(p.published_at) BETWEEN ? AND ? GROUP BY day ORDER BY day`, from, to,
  );
  const followers = db.all(`SELECT date, followers_count FROM account_snapshots WHERE date BETWEEN ? AND ? ORDER BY date`, from, to);
  const totals = rows.reduce((a, r) => ({ reach: a.reach + r.reach, views: a.views + r.views, likes: a.likes + r.likes, comments: a.comments + r.comments, shares: a.shares + r.shares, saved: a.saved + r.saved }), { reach: 0, views: 0, likes: 0, comments: 0, shares: 0, saved: 0 });
  return {
    from, to, posts: rows.length, totals,
    engagementRate: totals.reach ? (totals.likes + totals.comments + totals.shares + totals.saved) / totals.reach : 0,
    growth: followers.length >= 2 ? (followers[followers.length - 1].followers_count ?? 0) - (followers[0].followers_count ?? 0) : null,
    series, followers, top5: topContents(rows), byFormat: groupPerformance(rows, 'media_type'), byPillar: groupPerformance(rows, 'pillar'),
  };
}

