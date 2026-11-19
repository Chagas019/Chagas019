/**
 * Dados FICTÍCIOS para desenvolvimento e demonstração do painel.
 * - Recusa rodar em produção.
 * - Não conecta nem simula conta do Instagram: integrações continuam "não configuradas".
 * - Tudo é marcado com [DEMO] e IDs de mídia "demo_*", e nada disso é publicável (publishGates bloqueia).
 */
import { loadEnv } from '../config/env.js';
import { getDb } from '../db/db.js';
import { createUser } from '../security/auth.js';
import { allocateCalendar } from '../agents/calendar.js';
import { getSettings } from '../db/repo.js';
import { saveCopy } from '../agents/copywriter.js';
import { produceProject } from '../agents/creativeStudio.js';
import { buildCaption } from '../quality/copy.js';
import { addDays, todayIn } from '../lib/time.js';

const e = loadEnv();
if (e.NODE_ENV === 'production') {
  console.error('Seed de demonstração não pode rodar em produção.');
  process.exit(1);
}
const db = getDb();
if (db.get(`SELECT 1 FROM editorial_calendar LIMIT 1`)) {
  console.log('Banco já possui dados — seed ignorado.');
  process.exit(0);
}

if (!db.get('SELECT 1 FROM users')) {
  createUser('admin@demo.local', 'Admin Demo', 'demo-senha-segura', 'admin');
  console.log('Usuário demo: admin@demo.local / demo-senha-segura (troque em ambientes reais)');
}

const s = getSettings();
const today = todayIn(s.timezone);
const start = addDays(today, -6);
const THEMES = ['Luz de janela para retratos', 'Modo noturno sem tremer', 'Apps grátis de edição', 'Regra dos terços na prática', 'Cor e contraste no Lightroom Mobile', 'Bastidores de um ensaio com celular', 'Macro com lente acoplada', 'Enquadramento para Reels', 'Preset próprio em 5 passos', 'Fotografia de rua discreta', 'Timelapse com o celular', 'Sombras duras ao meio-dia', 'Selfie que não parece selfie', 'Comida com luz natural'];
const plan = allocateCalendar({ startDate: start, days: 30, pillars: s.pillars, reelsPerDay: 1, feedPerDay: 1, times: s.publish_times });
plan.forEach((p, i) => {
  db.run(`INSERT INTO editorial_calendar (date, slot, scheduled_time, format, pillar, theme, status) VALUES (?, ?, ?, ?, ?, ?, 'planned')`,
    p.date, p.slot, p.time, p.format, p.pillar, p.slot === 'stories' ? 'Enquete + chamada para o Reel' : `[DEMO] ${THEMES[i % THEMES.length]}`);
});

db.run(`INSERT INTO trends (report_date, source, title, summary, topic, format, hook_pattern, narrative_structure, duration_seconds, visual_style, cta_pattern, adaptation_potential, momentum, engagement_signal, reference_urls) VALUES
  (?, 'web_search', '[DEMO] Antes e depois em 1 corte', 'Resultado final aparece no primeiro segundo e o passo a passo vem depois.', 'edição', 'REELS', 'mostrar o resultado antes da explicação', 'resultado → 3 passos → CTA salvar', 15, 'tela dividida, cortes secos', 'salve para testar', 86, 'rising', '{"evidence":"dado fictício"}', '[]'),
  (?, 'web_search', '[DEMO] Carrossel checklist', 'Listas de checagem curtas geram salvamentos.', 'fotografia', 'CAROUSEL', 'número + promessa concreta', 'capa → 1 item por slide → CTA', NULL, 'tipografia grande, fundo escuro', 'salve/compartilhe', 74, 'stable', '{"evidence":"dado fictício"}', '[]')`, today, today);
db.run(`INSERT INTO daily_reports (type, period_start, period_end, summary, data) VALUES ('trends', ?, ?, '[DEMO] Relatório fictício de tendências para visualização do painel.', '{"limitations":"Dados fictícios de demonstração","opportunities":["Série semanal de apps"],"apps":["App fictício"]}')`, today, today);

const copyFor = (format: string, theme: string) => ({
  title: theme, hook: 'Sua foto escura não é culpa do celular.',
  caption_body: 'Fixe o foco tocando no assunto, baixe a exposição até recuperar o céu e use a janela como luz principal.',
  cta: 'Salve para testar no próximo clique.', hashtags: ['fotografiamobile', 'dicasdefoto', 'fotocomcelular'],
  cover_title: theme.replace('[DEMO] ', ''), kicker: 'Demo',
  reel_script: format === 'REELS' ? { duration_seconds: 9, scenes: [
    { start: 0, end: 3, on_screen_text: 'Foto escura? Não é o celular', emphasis: null, voiceover: '', visual_direction: '' },
    { start: 3, end: 6, on_screen_text: 'Fixe foco e exposição', emphasis: 'segure o dedo na tela', voiceover: '', visual_direction: '' },
    { start: 6, end: 9, on_screen_text: 'Salve e teste hoje', emphasis: null, voiceover: '', visual_direction: '' },
  ] } : null,
  carousel_slides: format === 'CAROUSEL' ? [{ title: theme.replace('[DEMO] ', ''), body: '' }, { title: 'Fixe o foco', body: 'Segure o dedo no assunto até aparecer o bloqueio.' }, { title: 'Baixe a exposição', body: 'Arraste o sol para baixo até o céu voltar.' }, { title: 'Salve este guia', body: 'Teste hoje e compare o antes e depois.' }] : null,
  image: format === 'IMAGE' ? { headline: theme.replace('[DEMO] ', ''), subheadline: 'Exemplo fictício gerado pelo seed de demonstração.' } : null,
  stories: format === 'STORIES' ? [{ text: 'Você fotografa mais de dia ou de noite?', kicker: 'Enquete', interaction_prompt: 'Responda no Reel de hoje' }, { text: 'Hoje tem Reel novo às 18h30', kicker: null, interaction_prompt: null }, { text: 'Qual app você usa para editar?', kicker: 'Pergunta', interaction_prompt: 'Conta nos comentários' }] : null,
  visual_prompt: '',
});

const ctx: any = { log: (l: string, m: string) => console.log(`[${l}] ${m}`), addUsage: () => {}, memory: { get: (_: string, f: any) => f, set: () => {} } };
const rows = db.all(`SELECT * FROM editorial_calendar WHERE date BETWEEN ? AND ? ORDER BY date, slot`, start, today);
let n = 0;
for (const r of rows) {
  const c = copyFor(r.format, r.theme);
  const idea = db.run(`INSERT INTO content_ideas (title, theme, pillar, objective, format, audience, hook, cta, suggested_time, rationale) VALUES (?, ?, ?, 'salvamentos', ?, 'iniciantes', ?, ?, ?, 'Pauta fictícia de demonstração')`,
    r.theme, r.theme, r.pillar, r.format, c.hook, c.cta, r.scheduled_time);
  db.run(`UPDATE editorial_calendar SET content_idea_id=? WHERE id=?`, idea.lastId, r.id);
  const pid = saveCopy(r.id, idea.lastId, r.format, c as any, buildCaption({ hook: c.hook, body: c.caption_body, cta: c.cta, hashtags: c.hashtags }), []);
  await produceProject(pid, ctx);
  n++;
  if (r.date < today) {
    const mt = r.format === 'STORIES' ? 'STORIES' : r.format;
    const pub = db.run(`INSERT INTO publications (project_id, media_type, scheduled_at, status, content_hash, ig_media_id, published_at, asset_ids) VALUES (?, ?, ?, 'published', ?, ?, ?, '[]')`,
      pid, mt, `${r.date}T21:00:00.000Z`, `demo-${pid}`, `demo_${pid}`, `${r.date}T21:00:00.000Z`);
    const reach = 800 + ((pid * 397) % 2600);
    db.run(`INSERT INTO publication_metrics (publication_id, reach, views, likes, comments, shares, saved, raw) VALUES (?, ?, ?, ?, ?, ?, ?, '{"demo":true}')`,
      pub.lastId, reach, Math.round(reach * 1.6), Math.round(reach * 0.06), Math.round(reach * 0.008), Math.round(reach * (mt === 'CAROUSEL' ? 0.02 : 0.012)), Math.round(reach * (mt === 'CAROUSEL' ? 0.05 : 0.025)));
    db.run(`UPDATE content_projects SET status='published' WHERE id=?`, pid);
    db.run(`UPDATE editorial_calendar SET status='published' WHERE id=?`, r.id);
  }
}
console.log(`Seed de demonstração concluído: ${n} conteúdos fictícios (marcados [DEMO]).`);
