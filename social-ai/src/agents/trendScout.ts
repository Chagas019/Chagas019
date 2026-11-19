import { z } from 'zod';
import { getDb, json } from '../db/db.js';
import { getActiveAccount, getBrand, getSetting } from '../db/repo.js';
import { graphClientFor } from '../integrations/instagram/account.js';
import { getLLM } from '../integrations/llm/provider.js';
import { IntegrationUnavailableError } from '../lib/errors.js';
import { runAgent, getMemory, type AgentContext } from './base.js';

const TrendSchema = z.object({
  report_summary: z.string(),
  data_limitations: z.string(),
  trends: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    topic: z.string(),
    format: z.enum(['REELS', 'CAROUSEL', 'IMAGE', 'STORIES']),
    hook_pattern: z.string(),
    narrative_structure: z.string(),
    duration_seconds: z.number().int().nullable(),
    visual_style: z.string(),
    cta_pattern: z.string(),
    adaptation_potential: z.number().int().min(0).max(100),
    momentum: z.enum(['rising', 'stable', 'declining']),
    source: z.enum(['hashtag_search', 'business_discovery', 'web_search', 'own_account']),
    evidence: z.string(),
    reference_urls: z.array(z.string()),
  })),
  opportunities: z.array(z.string()),
  new_apps_or_tools: z.array(z.string()),
});

interface Signal {
  source: 'hashtag_search' | 'business_discovery' | 'own_account';
  origin: string;
  media_type: string;
  product_type?: string;
  likes?: number;
  comments?: number;
  /** Apenas a primeira linha, truncada, para análise de PADRÃO de gancho. Não é armazenada. */
  first_line?: string;
  caption_length?: number;
  permalink?: string;
  timestamp?: string;
}

function toSignal(m: any, source: Signal['source'], origin: string): Signal {
  const caption: string = m.caption ?? '';
  return {
    source, origin,
    media_type: m.media_type, product_type: m.media_product_type,
    likes: m.like_count, comments: m.comments_count,
    first_line: caption.split('\n')[0]?.slice(0, 110),
    caption_length: caption.length,
    permalink: m.permalink, timestamp: m.timestamp,
  };
}

/** Coleta sinais apenas por fontes oficiais/autorizadas (Graph API). Sem scraping. */
async function collectSignals(ctx: AgentContext) {
  const signals: Signal[] = [];
  const notes: string[] = [];
  const acc = getActiveAccount();
  if (!acc) {
    notes.push('Conta do Instagram não conectada: Hashtag Search, Business Discovery e mídia própria indisponíveis.');
    return { signals, notes };
  }
  const client = graphClientFor(acc);
  const sources = getSetting('trend_sources');
  const db = getDb();

  // Hashtag Search: limite oficial de 30 hashtags únicas por 7 dias.
  const recent = db.all<{ hashtag: string }>(`SELECT DISTINCT hashtag FROM hashtag_queries WHERE queried_at > datetime('now','-7 days')`).map((r) => r.hashtag);
  for (const tag of sources.hashtags.slice(0, 10)) {
    const used = new Set(recent);
    if (!used.has(tag) && used.size >= 30) {
      notes.push(`Limite de 30 hashtags/7 dias atingido; #${tag} ignorada.`);
      continue;
    }
    try {
      const id = await client.hashtagId(acc.ig_user_id, tag);
      db.run('INSERT INTO hashtag_queries (hashtag, hashtag_id) VALUES (?, ?)', tag, id);
      recent.push(tag);
      if (!id) continue;
      const top = await client.hashtagTopMedia(acc.ig_user_id, id);
      for (const m of top.data ?? []) signals.push(toSignal(m, 'hashtag_search', `#${tag}`));
    } catch (e: any) {
      notes.push(`Hashtag #${tag}: ${e.message} (requer o recurso "Instagram Public Content Access").`);
      ctx.log('warn', `Hashtag Search indisponível para #${tag}`, { error: e.message });
      break;
    }
  }

  for (const username of sources.reference_accounts) {
    try {
      const r: any = await client.businessDiscovery(acc.ig_user_id, username.replace(/^@/, ''));
      for (const m of r.business_discovery?.media?.data ?? []) signals.push(toSignal(m, 'business_discovery', `@${username}`));
    } catch (e: any) {
      notes.push(`Business Discovery @${username}: ${e.message}`);
    }
  }

  try {
    const own = await client.ownMedia(acc.ig_user_id, 25);
    for (const m of own.data ?? []) signals.push(toSignal(m, 'own_account', `@${acc.username}`));
  } catch (e: any) {
    notes.push(`Mídia própria: ${e.message}`);
  }
  return { signals, notes };
}

function summarizeSignals(signals: Signal[]) {
  const byFormat: Record<string, { n: number; likes: number; comments: number }> = {};
  for (const s of signals) {
    const f = s.product_type === 'REELS' ? 'REELS' : s.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : s.media_type;
    byFormat[f] ??= { n: 0, likes: 0, comments: 0 };
    byFormat[f].n++;
    byFormat[f].likes += s.likes ?? 0;
    byFormat[f].comments += s.comments ?? 0;
  }
  const top = [...signals].sort((a, b) => (b.likes ?? 0) + 3 * (b.comments ?? 0) - ((a.likes ?? 0) + 3 * (a.comments ?? 0))).slice(0, 40);
  return { total: signals.length, byFormat, top };
}

export async function researchTrends(date: string, jobId?: number) {
  return runAgent('trend_scout', { date }, async (ctx) => {
    const brand = getBrand();
    const sources = getSetting('trend_sources');
    const { signals, notes } = await collectSignals(ctx);
    const llm = getLLM();
    if (!signals.length && !sources.web_search) {
      throw new IntegrationUnavailableError('instagram', 'Nenhuma fonte de tendências disponível (conecte o Instagram ou habilite a pesquisa web).');
    }
    const sum = summarizeSignals(signals);
    const prompt = `Data: ${date}. Nicho do perfil: ${brand.niche}. Público: ${brand.audience ?? 'criadores e entusiastas brasileiros'}.

SINAIS DA GRAPH API OFICIAL (${sum.total} publicações públicas; apenas curtidas e comentários são públicos):
${JSON.stringify({ porFormato: sum.byFormat, topPublicacoes: sum.top }, null, 1)}

Observações de coleta: ${notes.join(' | ') || 'nenhuma'}

${sources.web_search ? `Pesquise também na web (fontes públicas: portais de tecnologia, blogs de fotografia, notas de lançamento de apps, central de criadores do Instagram) as novidades das últimas 2 semanas sobre: fotografia mobile, apps de edição de foto/vídeo, recursos novos do Instagram/Reels, tendências de edição e formatos de conteúdo no Brasil.` : 'Não use pesquisa web.'}

Entregue de 6 a 12 tendências acionáveis para o nicho. Para cada uma, descreva o PADRÃO (gancho, estrutura, duração, estilo visual, CTA) de forma abstrata — nunca reproduza legendas ou roteiros de terceiros. Em "evidence" diga o que foi observado e o quão forte é o sinal.`;
    const res = await llm.json({
      system: ctx.instructions,
      prompt,
      schema: TrendSchema,
      webSearch: sources.web_search ? { maxUses: 8 } : undefined,
    });
    ctx.addUsage(res.usage);
    const db = getDb();
    db.tx(() => {
      db.run('DELETE FROM trends WHERE report_date = ?', date);
      for (const t of res.data.trends) {
        db.run(
          `INSERT INTO trends (report_date, source, title, summary, topic, format, hook_pattern, narrative_structure, duration_seconds,
            visual_style, cta_pattern, adaptation_potential, momentum, engagement_signal, reference_urls)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          date, t.source, t.title, t.summary, t.topic, t.format, t.hook_pattern, t.narrative_structure, t.duration_seconds,
          t.visual_style, t.cta_pattern, t.adaptation_potential, t.momentum, JSON.stringify({ evidence: t.evidence }),
          JSON.stringify(t.reference_urls.slice(0, 5)),
        );
      }
      db.run(
        `INSERT INTO daily_reports (type, period_start, period_end, summary, data) VALUES ('trends', ?, ?, ?, ?)
         ON CONFLICT(type, period_start) DO UPDATE SET summary=excluded.summary, data=excluded.data, created_at=datetime('now')`,
        date, date, res.data.report_summary,
        JSON.stringify({ limitations: res.data.data_limitations, notes, opportunities: res.data.opportunities, apps: res.data.new_apps_or_tools, signals: { total: sum.total, byFormat: sum.byFormat }, web_sources: res.sources }),
      );
    });
    return { trends: res.data.trends.length, signals: sum.total, webSources: res.sources.length };
  }, jobId);
}

/**
 * 07:00 — Análise de oportunidades: cruza tendências do dia com o desempenho real do perfil
 * (memória do Analyst) e calcula um score determinístico de prioridade.
 */
export async function analyzeOpportunities(date: string, jobId?: number) {
  return runAgent('trend_scout', { date, step: 'analysis' }, async (ctx) => {
    const db = getDb();
    const trends = db.all('SELECT * FROM trends WHERE report_date = ?', date);
    if (!trends.length) throw new Error(`Sem tendências para ${date}. Rode a pesquisa primeiro.`);
    const formatPerf: Record<string, { avgEngagement: number; n: number }> = getMemory('analyst').format_performance ?? {};
    const maxEng = Math.max(0.0001, ...Object.values(formatPerf).map((f) => f.avgEngagement));
    const ranked = trends.map((t) => {
      const perf = formatPerf[t.format];
      const perfBoost = perf && perf.n >= 3 ? (perf.avgEngagement / maxEng) * 20 : 0; // só pesa com amostra mínima
      const momentum = t.momentum === 'rising' ? 15 : t.momentum === 'stable' ? 5 : -10;
      const score = Math.round(Math.max(0, Math.min(100, t.adaptation_potential * 0.65 + momentum + perfBoost)));
      return { id: t.id, title: t.title, format: t.format, score, basis: { adaptation: t.adaptation_potential, momentum: t.momentum, perfBoost: Math.round(perfBoost), sample: perf?.n ?? 0 } };
    }).sort((a, b) => b.score - a.score);
    const report = db.get(`SELECT * FROM daily_reports WHERE type='trends' AND period_start=?`, date);
    const data = json.parse<any>(report?.data, {});
    data.ranked_opportunities = ranked;
    db.run(`UPDATE daily_reports SET data=? WHERE type='trends' AND period_start=?`, JSON.stringify(data), date);
    ctx.log('info', `Oportunidades ranqueadas: ${ranked.length}`);
    return { ranked: ranked.slice(0, 5) };
  }, jobId);
}
