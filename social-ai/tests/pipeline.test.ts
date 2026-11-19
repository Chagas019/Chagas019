import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { setupTestEnv, useLLM, fakeGraph, sampleCopy } from './helpers.js';
import { getDb, json } from '../src/db/db.js';
import { setSetting } from '../src/db/repo.js';
import { researchTrends, analyzeOpportunities } from '../src/agents/trendScout.js';
import { buildCalendar, dailyStrategy } from '../src/agents/strategist.js';
import { writeDay } from '../src/agents/copywriter.js';
import { produceDay, mediaDir } from '../src/agents/creativeStudio.js';
import { performPublish, publishGates, publishOne, scheduleProject, emergencyPause, dispatchDue, setProductionMode } from '../src/agents/publisher.js';
import { graphClientFor } from '../src/integrations/instagram/account.js';
import { encrypt } from '../src/security/crypto.js';
import { buildReport, topContents, groupPerformance, latestMetrics } from '../src/agents/analyst.js';
import { tick } from '../src/orchestrator/scheduler.js';

const DATE = '2026-12-01';
const WORDS = 'luz janela retrato macro noturna paisagem cores contraste lightroom snapseed capcut enquadramento simetria sombras reflexos textura movimento timelapse slowmotion bokeh silhueta minimalismo grafismo rua comida produto viagem selfie'.split(' ');

const trendResponse = () => ({
  report_summary: '[FICTÍCIO] Reels curtos de "antes e depois" seguem fortes.',
  data_limitations: 'Somente pesquisa web nos testes.',
  trends: [
    { title: 'Antes e depois de edição', summary: 's', topic: 'edição', format: 'REELS', hook_pattern: 'resultado primeiro', narrative_structure: 'resultado → passos → CTA', duration_seconds: 15, visual_style: 'split screen', cta_pattern: 'salve', adaptation_potential: 85, momentum: 'rising', source: 'web_search', evidence: 'fictícia', reference_urls: ['https://exemplo.invalid/a'] },
    { title: 'Guia em carrossel de apps', summary: 's', topic: 'apps', format: 'CAROUSEL', hook_pattern: 'lista', narrative_structure: 'lista numerada', duration_seconds: null, visual_style: 'minimal', cta_pattern: 'compartilhe', adaptation_potential: 70, momentum: 'stable', source: 'web_search', evidence: 'fictícia', reference_urls: [] },
  ],
  opportunities: ['Série semanal de apps'],
  new_apps_or_tools: ['App fictício X'],
});

describe('pipeline completo com dados fictícios', () => {
  beforeAll(() => {
    setupTestEnv();
  });

  it('Trend Scout gera relatório (sem conta conectada → só web) e ranqueia oportunidades', async () => {
    const llm = useLLM([trendResponse]);
    const r = await researchTrends(DATE);
    expect(r.trends).toBe(2);
    expect(llm.calls[0].webSearch).toBe(true);
    expect(llm.calls[0].prompt).toContain('Conta do Instagram não conectada');
    const a = await analyzeOpportunities(DATE);
    expect(a.ranked[0].title).toBe('Antes e depois de edição');
    const exec = getDb().all(`SELECT * FROM agent_executions WHERE agent_key='trend_scout'`);
    expect(exec.every((e) => e.status === 'success')).toBe(true);
  });

  it('Strategist cria calendário de 30 dias e as pautas do dia', async () => {
    useLLM([
      (prompt) => {
        const slots = JSON.parse(prompt.slice(prompt.indexOf('Slots: ') + 7));
        return { items: slots.map((s: any, i: number) => ({ date: s.date, slot: s.slot, theme: `${WORDS[i % WORDS.length]} n${i}`, notes: '' })) };
      },
    ]);
    const c = await buildCalendar(DATE, 30);
    expect(c.slots).toBe(90);
    expect(c.remainingConflicts).toBe(0);
    useLLM([
      () => ({ briefs: ['reel', 'feed', 'stories'].map((slot) => ({ slot, title: `Pauta ${slot}`, theme: `Tema ${slot}`, objective: 'salvamentos', audience: 'iniciantes', hook: 'gancho', cta: 'salve', suggested_time: slot === 'feed' ? '12:30' : '18:00', rationale: 'fictício', trend_title: slot === 'reel' ? 'Antes e depois de edição' : null })) }),
    ]);
    const d = await dailyStrategy(DATE);
    expect(d.created).toBe(3);
    const reel = getDb().get(`SELECT * FROM editorial_calendar WHERE date=? AND slot='reel'`, DATE);
    expect(reel.scheduled_time).toBe('18:00');
    expect(getDb().get(`SELECT trend_id FROM content_ideas WHERE id=?`, reel.content_idea_id).trend_id).toBeTruthy();
  });

  it('Copywriter escreve roteiros, legendas e reescreve copy reprovada', async () => {
    const fmt = (p: string) => /"formato":"(\w+)"/.exec(p)![1];
    let reelAttempts = 0;
    // A 1ª versão do Reel vem com legenda vazia → deve ser reprovada e reescrita.
    const responder = (p: string) => (fmt(p) === 'REELS' && reelAttempts++ === 0 ? { ...sampleCopy('REELS'), caption_body: '' } : sampleCopy(fmt(p)));
    const responders = [responder, responder, responder, responder];
    const llm = useLLM(responders);
    const r = await writeDay(DATE);
    expect(r.projects).toHaveLength(3);
    expect(llm.calls.some((c) => c.prompt.includes('foi reprovada'))).toBe(true);
    expect(getDb().get(`SELECT COUNT(*) n FROM captions`).n).toBe(3);
  });

  it('Creative Studio renderiza imagens, carrossel, stories e Reel (FFmpeg) e aprova no QA', async () => {
    const r = await produceDay(DATE);
    for (const p of r.produced as any[]) expect(p.status, JSON.stringify(p)).toBe('review');
    const assets = getDb().all(`SELECT * FROM media_assets`);
    expect(assets.some((a) => a.kind === 'video' && a.mime === 'video/mp4')).toBe(true);
    for (const a of assets) expect(fs.existsSync(path.join(mediaDir(), a.file_name))).toBe(true);
    const video = assets.find((a) => a.kind === 'video');
    expect(video.duration_seconds).toBeGreaterThan(3);
  }, 120_000);

  it('Publisher: agenda, bloqueia em teste/sem produção e detecta duplicidade', async () => {
    const projects = getDb().all(`SELECT id, format FROM content_projects`);
    for (const p of projects) getDb().run(`UPDATE content_projects SET status='approved' WHERE id=?`, p.id);
    const reel = projects.find((p) => p.format === 'REELS')!;
    const s1 = scheduleProject(reel.id);
    expect(s1.created).toHaveLength(1);
    const stories = projects.find((p) => p.format === 'STORIES')!;
    expect(scheduleProject(stories.id).created.length).toBe(3);

    // duplicidade: mesmo conteúdo reagendado
    getDb().run(`UPDATE content_projects SET status='approved' WHERE id=?`, reel.id);
    expect(scheduleProject(reel.id).blocked[0]).toContain('duplicado');

    const pubId = s1.created[0];
    const gates = publishGates(getDb().get(`SELECT * FROM publications WHERE id=?`, pubId));
    expect(gates.ok).toBe(false);
    expect(gates.reasons.join('|')).toMatch(/teste/);
    expect(gates.reasons.join('|')).toMatch(/Modo de produção desligado/);
    expect(gates.reasons.join('|')).toMatch(/Integração com o Instagram indisponível/);

    const out: any = await publishOne(pubId);
    expect(out.blocked.length).toBeGreaterThan(0);
    expect(getDb().get(`SELECT status FROM publications WHERE id=?`, pubId).status).toBe('blocked');

    expect(() => setProductionMode(true, 'ATIVAR PRODUÇÃO')).toThrow(/Requisitos pendentes/);
  });

  it('arquivo corrompido bloqueia publicação', () => {
    const pub = getDb().get(`SELECT * FROM publications WHERE media_type='STORIES' LIMIT 1`);
    const asset = getDb().get(`SELECT * FROM media_assets WHERE id=?`, json.parse<number[]>(pub.asset_ids, [])[0]);
    const f = path.join(mediaDir(), asset.file_name);
    const orig = fs.readFileSync(f);
    fs.writeFileSync(f, Buffer.concat([orig, Buffer.from('lixo')]));
    expect(publishGates(pub).reasons.some((r) => r.includes('corrompido'))).toBe(true);
    fs.writeFileSync(f, orig);
  });

  it('fluxo oficial da Graph API (container → status → publish) com HTTP falso, retry seguro', async () => {
    getDb().run(`INSERT INTO instagram_accounts (ig_user_id, username, access_token_enc, permissions, permissions_confirmed, eligibility)
      VALUES ('1789', 'perfil_ficticio', ?, '["instagram_content_publish"]', 1, '{"ok":true}')`, encrypt('token-ficticio'));
    const pub = getDb().get(`SELECT * FROM publications WHERE media_type='REELS'`);
    getDb().run(`UPDATE publications SET status='scheduled', account_id=1 WHERE id=?`, pub.id);
    let statusCalls = 0;
    let failPublishOnce = true;
    const calls = fakeGraph({
      'GET 1789/content_publishing_limit': () => ({ data: [{ quota_usage: 2, config: { quota_total: 100 } }] }),
      'POST 1789/media': (_u, b) => {
        expect(b.get('media_type')).toBe('REELS');
        expect(b.get('video_url')).toMatch(/\/media\/public\/.+\.mp4$/);
        return { id: 'container-1' };
      },
      'GET container-1': () => ({ status_code: ++statusCalls < 2 ? 'IN_PROGRESS' : 'FINISHED' }),
      'POST 1789/media_publish': () => {
        if (failPublishOnce) {
          failPublishOnce = false;
          const e: any = new Error('x');
          e.status = 500;
          e.graph = { message: 'Erro temporário', code: 2 };
          throw e;
        }
        return { id: 'media-99' };
      },
      'GET media-99': () => ({ id: 'media-99', permalink: 'https://instagram.invalid/p/ficticio' }),
    });
    const client = graphClientFor(getDb().get(`SELECT * FROM instagram_accounts WHERE id=1`), { pollIntervalMs: 1, sleep: async () => {} });
    const ctx = { log: () => {} };
    await expect(performPublish(pub.id, client, ctx)).rejects.toThrow(/temporário/);
    expect(getDb().get(`SELECT status, container_id FROM publications WHERE id=?`, pub.id)).toMatchObject({ status: 'retrying', container_id: 'container-1' });
    // Retry reaproveita o container (não cria outro)
    const r: any = await performPublish(pub.id, client, ctx);
    expect(r.mediaId).toBe('media-99');
    expect(calls.filter((c) => c.method === 'POST' && c.path === '1789/media')).toHaveLength(1);
    const final = getDb().get(`SELECT * FROM publications WHERE id=?`, pub.id);
    expect(final.status).toBe('published');
    expect(final.permalink).toContain('ficticio');
    expect(getDb().get(`SELECT COUNT(*) n FROM jobs WHERE type='analyst.collect_one'`).n).toBe(1);
    // Chamada repetida é idempotente
    const again: any = await publishOne(pub.id);
    expect(again.skipped).toBe('já publicada');
  });

  it('botão de emergência pausa despacho', () => {
    getDb().run(`UPDATE publications SET status='scheduled', scheduled_at='2000-01-01T12:00:00Z' WHERE media_type='STORIES'`);
    emergencyPause();
    expect(dispatchDue(new Date('2026-12-01T15:00:00Z'))).toBe(0);
    setSetting('publishing_paused', false);
    expect(dispatchDue(new Date('2026-12-01T15:00:00Z'))).toBeGreaterThan(0);
    // Fora da janela de publicação (03:00 em SP) nada é despachado
    getDb().run(`DELETE FROM jobs WHERE type='publisher.publish'`);
    expect(dispatchDue(new Date('2026-12-01T06:00:00Z'))).toBe(0);
  });

  it('Analyst: top 5, desempenho por formato com amostra e retroalimentação ao Strategist', async () => {
    const pub = getDb().get(`SELECT * FROM publications WHERE status='published'`);
    getDb().run(`UPDATE publications SET published_at=? WHERE id=?`, `${DATE}T21:00:00.000Z`, pub.id);
    getDb().run(`INSERT INTO publication_metrics (publication_id, reach, likes, comments, shares, saved) VALUES (?, 1000, 80, 10, 15, 40)`, pub.id);
    const rows = latestMetrics(DATE, DATE);
    expect(rows).toHaveLength(1);
    expect(topContents(rows)[0].engagement_rate).toBeCloseTo(0.145);
    expect(groupPerformance(rows, 'media_type')[0]).toMatchObject({ group: 'REELS', n: 1, confidence: 'insuficiente' });
    useLLM([() => ({ summary: '[FICTÍCIO] resumo', recommendations: [{ hypothesis: 'Reels de antes/depois salvam mais', action: 'testar 2x', evidence: 'n=1', confidence: 'baixa' }], caveats: 'amostra mínima' })]);
    const rep = await buildReport('daily', DATE, DATE, { addUsage: () => {}, log: () => {} });
    expect(rep.data.top5).toHaveLength(1);
    const mem = json.parse<any>(getDb().get(`SELECT memory FROM agents WHERE key='strategist'`).memory, {});
    expect(mem.analyst_recommendations[0].confidence).toBe('baixa');
  });

  it('orquestrador enfileira etapas em ordem e respeita dependências', () => {
    getDb().run(`DELETE FROM jobs`);
    // 10:30 em São Paulo: todas as etapas já "venceram", mas só a primeira entra (as outras dependem dela)
    const a = tick(new Date('2026-12-02T13:30:00Z'));
    expect(a).toContain('enqueue:trend_research');
    expect(a).not.toContain('enqueue:strategy');
    getDb().run(`UPDATE jobs SET status='done' WHERE dedupe_key='routine:trend_research:2026-12-02'`);
    expect(tick(new Date('2026-12-02T13:31:00Z'))).toContain('enqueue:trend_analysis');
  });
});
