import { analyzeOpportunities, researchTrends } from '../agents/trendScout.js';
import { buildCalendar, dailyStrategy } from '../agents/strategist.js';
import { writeDay } from '../agents/copywriter.js';
import { produceDay, produceSingle } from '../agents/creativeStudio.js';
import { publishOne } from '../agents/publisher.js';
import { collectOne, nightlyAnalysis } from '../agents/analyst.js';
import { runBackup } from '../lib/backup.js';
import type { Job } from './queue.js';

export type Handler = (payload: any, job: Job) => Promise<unknown>;

/** Mapa tipo de tarefa → agente responsável. */
export const HANDLERS: Record<string, Handler> = {
  'trend_scout.research': (p, j) => researchTrends(p.date, j.id),
  'trend_scout.analyze': (p, j) => analyzeOpportunities(p.date, j.id),
  'strategist.calendar': (p, j) => buildCalendar(p.startDate, p.days ?? 30, j.id),
  'strategist.daily': (p, j) => dailyStrategy(p.date, j.id),
  'copywriter.write': (p, j) => writeDay(p.date, j.id),
  'creative.produce': (p, j) => produceDay(p.date, j.id),
  'creative.produce_one': (p, j) => produceSingle(p.projectId, j.id),
  'publisher.publish': (p, j) => publishOne(p.publicationId, { jobId: j.id }),
  'analyst.nightly': (p, j) => nightlyAnalysis(p.date, j.id),
  'analyst.collect_one': (p, j) => collectOne(p.publicationId, j.id),
  'system.backup': async () => runBackup(),
};

export const STAGES = [
  { key: 'trend_research', type: 'trend_scout.research', lane: 'trend_scout', label: 'Pesquisar tendências' },
  { key: 'trend_analysis', type: 'trend_scout.analyze', lane: 'trend_scout', label: 'Analisar referências e oportunidades' },
  { key: 'strategy', type: 'strategist.daily', lane: 'strategist', label: 'Criar estratégia editorial' },
  { key: 'copywriting', type: 'copywriter.write', lane: 'copywriter', label: 'Gerar roteiros e copies' },
  { key: 'creative', type: 'creative.produce', lane: 'creative_studio', label: 'Renderizar e validar mídias' },
] as const;
