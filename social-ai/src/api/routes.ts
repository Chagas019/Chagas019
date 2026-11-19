import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getDb, json } from '../db/db.js';
import { audit, getActiveAccount, getBrand, getSettings, setSetting, updateBrand } from '../db/repo.js';
import { DEFAULT_SETTINGS, type Settings } from '../db/settingsDefaults.js';
import { authenticate, createSession, destroySession } from '../security/auth.js';
import { cookieOptions, requireRole, SESSION_COOKIE } from './server.js';
import { STAGES } from '../orchestrator/handlers.js';
import { enqueue } from '../orchestrator/queue.js';
import { runPipelineNow, stageStatus } from '../orchestrator/scheduler.js';
import { todayIn, addDays } from '../lib/time.js';
import { mediaDir } from '../agents/creativeStudio.js';
import { latestCaption, saveCaptionVersion } from '../agents/copywriter.js';
import { emergencyPause, productionChecklist, publishGates, resumePublishing, scheduleProject, setProductionMode } from '../agents/publisher.js';
import { analyticsSummary } from '../agents/analyst.js';
import { completeOAuth, confirmPermissions, connectWithToken, disconnectAccount, oauthStartUrl, verifyAccount, verifyState } from '../integrations/instagram/account.js';
import { analyzeNiche, confirmNiche, NICHES } from '../integrations/instagram/niche.js';
import { checkIntegrations } from '../integrations/health.js';
import { PermanentError } from '../lib/errors.js';

const tz = () => getSettings().timezone;
const viewer = { preHandler: requireRole('viewer') };
const editor = { preHandler: requireRole('editor') };
const admin = { preHandler: requireRole('admin') };

function parseRow(r: any, fields: string[]) {
  if (!r) return r;
  const o = { ...r };
  for (const f of fields) if (f in o) o[f] = json.parse(o[f], null);
  return o;
}

export async function registerRoutes(app: FastifyInstance) {
  const db = () => getDb();

  app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));

  // ---------------- Autenticação ----------------
  app.post('/api/auth/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (req, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const user = authenticate(body.email, body.password);
    if (!user) {
      audit('auth.login_failed', { details: { email: body.email }, ip: req.ip });
      return reply.code(401).send({ error: 'Credenciais inválidas' });
    }
    const token = createSession(user.id, req.ip, req.headers['user-agent']);
    audit('auth.login', { userId: user.id, ip: req.ip });
    reply.setCookie(SESSION_COOKIE, token, cookieOptions());
    return { user };
  });
  app.post('/api/auth/logout', async (req, reply) => {
    const t = req.cookies[SESSION_COOKIE];
    if (t) destroySession(t);
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });
  app.get('/api/auth/me', async (req, reply) => (req.user ? { user: req.user } : reply.code(401).send({ error: 'Não autenticado' })));

  // ---------------- Dashboard ----------------
  app.get('/api/dashboard', viewer, async () => {
    const today = todayIn(tz());
    const s = getSettings();
    const agents = db().all(`SELECT key, name, role, status, enabled, last_run_at, last_error FROM agents`);
    const count = (sql: string, ...p: any[]) => db().get(sql, ...p)?.n ?? 0;
    const next = db().get(`SELECT p.id, p.media_type, p.scheduled_at, pr.title FROM publications p JOIN content_projects pr ON pr.id=p.project_id WHERE p.status='scheduled' ORDER BY p.scheduled_at LIMIT 1`);
    const todayPubs = db().all(
      `SELECT p.id, p.media_type, p.status, p.scheduled_at, p.permalink, pr.title FROM publications p JOIN content_projects pr ON pr.id=p.project_id
       WHERE date(p.scheduled_at) = ? OR date(p.published_at) = ? ORDER BY p.scheduled_at`, today, today);
    const analytics = analyticsSummary(30);
    const acc = getActiveAccount();
    return {
      today,
      agents,
      counts: {
        inProduction: count(`SELECT COUNT(*) n FROM content_projects WHERE status IN ('draft','copy_ready','rendering','review','approved')`),
        awaitingReview: count(`SELECT COUNT(*) n FROM content_projects WHERE status = 'review'`),
        scheduled: count(`SELECT COUNT(*) n FROM publications WHERE status IN ('scheduled','retrying')`),
        published: count(`SELECT COUNT(*) n FROM publications WHERE status = 'published'`),
        blocked: count(`SELECT COUNT(*) n FROM publications WHERE status IN ('blocked','failed')`),
      },
      todayPubs, next, analytics,
      routine: stageStatus(today),
      flags: { production_mode: s.production_mode, publishing_paused: s.publishing_paused, allow_env: env().ALLOW_PUBLISHING, require_human_approval: s.require_human_approval },
      account: acc ? { username: acc.username, followers: acc.followers_count, niche: acc.niche, niche_confirmed: !!acc.niche_confirmed } : null,
    };
  });

  // ---------------- Agentes ----------------
  app.get('/api/agents', viewer, async () => db().all(`SELECT * FROM agents`).map((a) => parseRow(a, ['tools', 'memory'])));
  app.patch('/api/agents/:key', admin, async (req) => {
    const { key } = req.params as { key: string };
    const b = z.object({ enabled: z.boolean().optional(), instructions: z.string().min(20).optional() }).parse(req.body);
    if (b.enabled !== undefined) db().run(`UPDATE agents SET enabled=?, status=CASE WHEN ? THEN 'idle' ELSE 'paused' END WHERE key=?`, b.enabled ? 1 : 0, b.enabled ? 1 : 0, key);
    if (b.instructions) db().run(`UPDATE agents SET instructions=? WHERE key=?`, b.instructions, key);
    audit('agent.update', { userId: req.user!.id, entity: 'agent', entityId: key, details: b });
    return parseRow(db().get(`SELECT * FROM agents WHERE key=?`, key), ['tools', 'memory']);
  });
  app.post('/api/agents/run', editor, async (req) => {
    const b = z.object({ type: z.enum(Object.keys({
      'trend_scout.research': 1, 'trend_scout.analyze': 1, 'strategist.daily': 1, 'strategist.calendar': 1,
      'copywriter.write': 1, 'creative.produce': 1, 'analyst.nightly': 1,
    }) as [string, ...string[]]), date: z.string().optional(), days: z.number().int().min(1).max(60).optional() }).parse(req.body);
    const date = b.date ?? todayIn(tz());
    const lane = b.type.startsWith('creative') ? 'creative_studio' : b.type.split('.')[0];
    const payload = b.type === 'strategist.calendar' ? { startDate: date, days: b.days ?? 30 } : { date };
    const id = enqueue({ type: b.type, lane, payload, dedupeKey: `manual:${b.type}:${date}:${Date.now()}`, priority: 2 });
    audit('agent.run', { userId: req.user!.id, details: { type: b.type, date } });
    return { jobId: id };
  });
  app.post('/api/pipeline/run', editor, async (req) => {
    const b = z.object({ date: z.string().optional() }).parse(req.body ?? {});
    const date = b.date ?? todayIn(tz());
    audit('pipeline.run', { userId: req.user!.id, details: { date } });
    return { jobs: runPipelineNow(date) };
  });
  app.get('/api/executions', viewer, async (req) => {
    const q = req.query as { agent?: string; limit?: string };
    const limit = Math.min(200, Number(q.limit ?? 50));
    const rows = q.agent
      ? db().all(`SELECT * FROM agent_executions WHERE agent_key=? ORDER BY id DESC LIMIT ?`, q.agent, limit)
      : db().all(`SELECT * FROM agent_executions ORDER BY id DESC LIMIT ?`, limit);
    return rows.map((r) => parseRow(r, ['input', 'output']));
  });
  app.get('/api/logs', viewer, async (req) => {
    const q = req.query as { agent?: string; level?: string; limit?: string };
    const conds: string[] = [];
    const params: any[] = [];
    if (q.agent) (conds.push('agent_key = ?'), params.push(q.agent));
    if (q.level) (conds.push('level = ?'), params.push(q.level));
    return db().all(`SELECT * FROM agent_logs ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`, ...params, Math.min(500, Number(q.limit ?? 100)))
      .map((r) => parseRow(r, ['data']));
  });
  app.get('/api/jobs', viewer, async () => db().all(`SELECT id, type, lane, status, attempts, max_attempts, run_at, last_error, created_at, updated_at FROM jobs ORDER BY id DESC LIMIT 100`));
  app.post('/api/jobs/:id/retry', editor, async (req) => {
    const { id } = req.params as { id: string };
    db().run(`UPDATE jobs SET status='queued', attempts=0, run_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status IN ('dead','failed','cancelled')`, Number(id));
    return { ok: true };
  });

  // ---------------- Tendências e relatórios ----------------
  app.get('/api/trends', viewer, async (req) => {
    const q = req.query as { date?: string };
    const date = q.date ?? db().get(`SELECT MAX(report_date) d FROM trends`)?.d ?? todayIn(tz());
    const trends = db().all(`SELECT * FROM trends WHERE report_date = ? ORDER BY adaptation_potential DESC`, date).map((t) => parseRow(t, ['engagement_signal', 'reference_urls']));
    const report = parseRow(db().get(`SELECT * FROM daily_reports WHERE type='trends' AND period_start=?`, date), ['data']);
    const dates = db().all(`SELECT DISTINCT report_date d FROM trends ORDER BY d DESC LIMIT 30`).map((r) => r.d);
    return { date, trends, report, dates };
  });
  app.get('/api/reports', viewer, async (req) => {
    const q = req.query as { type?: string };
    return db().all(`SELECT * FROM daily_reports ${q.type ? 'WHERE type = ?' : ''} ORDER BY period_start DESC LIMIT 60`, ...(q.type ? [q.type] : [])).map((r) => parseRow(r, ['data']));
  });

  // ---------------- Calendário ----------------
  app.get('/api/calendar', viewer, async (req) => {
    const q = req.query as { from?: string; to?: string };
    const from = q.from ?? todayIn(tz());
    const to = q.to ?? addDays(from, 29);
    return db().all(
      `SELECT c.*, i.title idea_title, i.objective, i.hook, i.cta, i.rationale, i.audience, p.status project_status
       FROM editorial_calendar c LEFT JOIN content_ideas i ON i.id = c.content_idea_id LEFT JOIN content_projects p ON p.id = c.project_id
       WHERE c.date BETWEEN ? AND ? ORDER BY c.date, c.slot`, from, to);
  });
  app.patch('/api/calendar/:id', editor, async (req) => {
    const { id } = req.params as { id: string };
    const b = z.object({ theme: z.string().optional(), pillar: z.string().optional(), scheduled_time: z.string().regex(/^\d{2}:\d{2}$/).optional(), notes: z.string().optional() }).parse(req.body);
    const cur = db().get(`SELECT * FROM editorial_calendar WHERE id=?`, Number(id));
    if (!cur) throw new PermanentError('Item não encontrado');
    db().run(`UPDATE editorial_calendar SET theme=?, pillar=?, scheduled_time=?, notes=? WHERE id=?`,
      b.theme ?? cur.theme, b.pillar ?? cur.pillar, b.scheduled_time ?? cur.scheduled_time, b.notes ?? cur.notes, cur.id);
    audit('calendar.update', { userId: req.user!.id, entity: 'calendar', entityId: id, details: b });
    return db().get(`SELECT * FROM editorial_calendar WHERE id=?`, cur.id);
  });

  // ---------------- Central de criação ----------------
  app.get('/api/projects', viewer, async (req) => {
    const q = req.query as { status?: string };
    const rows = db().all(
      `SELECT p.*, c.date, c.scheduled_time, c.pillar,
        (SELECT file_name FROM media_assets m WHERE m.project_id=p.id AND m.mime LIKE 'image/%' ORDER BY m.kind='cover' DESC, m.position LIMIT 1) thumb
       FROM content_projects p LEFT JOIN editorial_calendar c ON c.id = p.calendar_id
       ${q.status ? 'WHERE p.status = ?' : ''} ORDER BY p.id DESC LIMIT 200`, ...(q.status ? [q.status] : []));
    return rows.map((r) => parseRow(r, ['script', 'slides', 'stories', 'quality_report']));
  });
  app.get('/api/projects/:id', viewer, async (req) => {
    const id = Number((req.params as any).id);
    const p = parseRow(db().get(`SELECT p.*, c.date, c.scheduled_time, c.pillar FROM content_projects p LEFT JOIN editorial_calendar c ON c.id=p.calendar_id WHERE p.id=?`, id), ['script', 'slides', 'stories', 'quality_report']);
    if (!p) throw new PermanentError('Projeto não encontrado');
    const idea = p.idea_id ? db().get(`SELECT * FROM content_ideas WHERE id=?`, p.idea_id) : null;
    const assets = db().all(`SELECT * FROM media_assets WHERE project_id=? ORDER BY kind, position`, id).map((a) => parseRow(a, ['quality_issues']));
    const captions = db().all(`SELECT * FROM captions WHERE project_id=? ORDER BY version DESC`, id).map((c) => parseRow(c, ['hashtags']));
    const pubs = db().all(`SELECT * FROM publications WHERE project_id=? ORDER BY id`, id).map((x) => parseRow(x, ['block_reasons', 'asset_ids']));
    return { ...p, idea, assets, captions, publications: pubs };
  });
  app.post('/api/projects/:id/approve', editor, async (req) => {
    const id = Number((req.params as any).id);
    const p = db().get(`SELECT * FROM content_projects WHERE id=?`, id);
    if (!p) throw new PermanentError('Projeto não encontrado');
    if (!json.parse<any>(p.quality_report, {}).passed) throw new PermanentError('Projeto reprovado no controle de qualidade — regenere antes de aprovar.');
    if (!['review', 'approved'].includes(p.status)) throw new PermanentError(`Status ${p.status} não pode ser aprovado`);
    db().run(`UPDATE content_projects SET status='approved', updated_at=datetime('now') WHERE id=?`, id);
    audit('project.approve', { userId: req.user!.id, entity: 'project', entityId: id });
    const b = z.object({ schedule: z.boolean().default(true), at: z.string().datetime().optional() }).parse(req.body ?? {});
    return b.schedule ? scheduleProject(id, { userId: req.user!.id, at: b.at ? new Date(b.at) : undefined }) : { ok: true };
  });
  app.post('/api/projects/:id/reject', editor, async (req) => {
    const id = Number((req.params as any).id);
    const b = z.object({ reason: z.string().min(3) }).parse(req.body);
    db().run(`UPDATE content_projects SET status='rejected', updated_at=datetime('now') WHERE id=?`, id);
    audit('project.reject', { userId: req.user!.id, entity: 'project', entityId: id, details: b });
    return { ok: true };
  });
  app.post('/api/projects/:id/rerender', editor, async (req) => {
    const id = Number((req.params as any).id);
    return { jobId: enqueue({ type: 'creative.produce_one', lane: 'creative_studio', payload: { projectId: id }, dedupeKey: `rerender:${id}:${Date.now()}`, priority: 2 }) };
  });
  app.patch('/api/projects/:id/content', editor, async (req) => {
    const id = Number((req.params as any).id);
    const b = z.object({ slides: z.array(z.object({ title: z.string(), body: z.string() })).optional(), stories: z.array(z.any()).optional(), script: z.record(z.string(), z.any()).optional() }).parse(req.body);
    const p = db().get(`SELECT * FROM content_projects WHERE id=?`, id);
    if (!p) throw new PermanentError('Projeto não encontrado');
    if (['scheduled', 'published'].includes(p.status)) throw new PermanentError('Cancele o agendamento antes de editar');
    db().run(`UPDATE content_projects SET slides=?, stories=?, script=?, status='copy_ready', updated_at=datetime('now') WHERE id=?`,
      JSON.stringify(b.slides ?? json.parse(p.slides, [])), JSON.stringify(b.stories ?? json.parse(p.stories, [])),
      JSON.stringify(b.script ? { ...json.parse(p.script, {}), ...b.script } : json.parse(p.script, {})), id);
    audit('project.edit', { userId: req.user!.id, entity: 'project', entityId: id });
    return { ok: true, note: 'Conteúdo alterado — renderize novamente para atualizar as mídias.' };
  });

  // ---------------- Legendas ----------------
  app.get('/api/captions/:projectId', viewer, async (req) => db().all(`SELECT * FROM captions WHERE project_id=? ORDER BY version DESC`, Number((req.params as any).projectId)).map((c) => parseRow(c, ['hashtags'])));
  app.post('/api/captions/:projectId', editor, async (req) => {
    const projectId = Number((req.params as any).projectId);
    const p = db().get(`SELECT status FROM content_projects WHERE id=?`, projectId);
    if (!p) throw new PermanentError('Projeto não encontrado');
    if (['scheduled', 'published'].includes(p.status)) throw new PermanentError('Cancele o agendamento antes de editar a legenda');
    const b = z.object({ hook: z.string().optional(), body: z.string().min(1), cta: z.string().optional(), hashtags: z.array(z.string()).max(30) }).parse(req.body);
    const c = saveCaptionVersion(projectId, b, req.user!.email);
    audit('caption.edit', { userId: req.user!.id, entity: 'project', entityId: projectId, details: { version: c.version } });
    return parseRow(c, ['hashtags']);
  });

  // ---------------- Biblioteca de mídias ----------------
  app.get('/api/media', viewer, async () => db().all(
    `SELECT m.*, p.title, p.format FROM media_assets m LEFT JOIN content_projects p ON p.id = m.project_id ORDER BY m.id DESC LIMIT 300`,
  ).map((r) => parseRow(r, ['quality_issues'])));
  app.get('/api/media/file/:name', viewer, async (req, reply) => {
    const { name } = req.params as { name: string };
    if (!/^[A-Za-z0-9_-]+\.(jpg|mp4)$/.test(name)) return reply.code(404).send();
    const f = path.join(mediaDir(), name);
    if (!fs.existsSync(f)) return reply.code(404).send();
    reply.type(name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
    return reply.send(fs.createReadStream(f));
  });

  // ---------------- Publicações / agendamento ----------------
  app.get('/api/publications', viewer, async (req) => {
    const q = req.query as { status?: string };
    return db().all(
      `SELECT p.*, pr.title, pr.format, c.full_text caption,
        (SELECT m.reach FROM publication_metrics m WHERE m.publication_id=p.id ORDER BY m.collected_at DESC, m.id DESC LIMIT 1) reach
       FROM publications p JOIN content_projects pr ON pr.id = p.project_id LEFT JOIN captions c ON c.id = p.caption_id
       ${q.status ? 'WHERE p.status = ?' : ''} ORDER BY p.scheduled_at DESC LIMIT 300`, ...(q.status ? [q.status] : [])).map((r) => parseRow(r, ['block_reasons', 'asset_ids']));
  });
  app.get('/api/publications/:id/preflight', viewer, async (req) => {
    const pub = db().get(`SELECT * FROM publications WHERE id=?`, Number((req.params as any).id));
    if (!pub) throw new PermanentError('Publicação não encontrada');
    return publishGates(pub);
  });
  app.patch('/api/publications/:id', editor, async (req) => {
    const id = Number((req.params as any).id);
    const b = z.object({ scheduled_at: z.string().datetime() }).parse(req.body);
    const r = db().run(`UPDATE publications SET scheduled_at=?, updated_at=datetime('now') WHERE id=? AND status IN ('scheduled','blocked','failed')`, b.scheduled_at, id);
    if (!r.changes) throw new PermanentError('Só é possível reagendar publicações agendadas, bloqueadas ou com falha');
    db().run(`UPDATE publications SET status='scheduled' WHERE id=? AND status IN ('blocked','failed')`, id);
    audit('publication.reschedule', { userId: req.user!.id, entity: 'publication', entityId: id, details: b });
    return { ok: true };
  });
  app.post('/api/publications/:id/cancel', editor, async (req) => {
    const id = Number((req.params as any).id);
    const pub = db().get(`SELECT * FROM publications WHERE id=?`, id);
    if (!pub || !['scheduled', 'blocked', 'failed', 'retrying'].includes(pub.status)) throw new PermanentError('Publicação não pode ser cancelada');
    db().run(`UPDATE publications SET status='cancelled', updated_at=datetime('now') WHERE id=?`, id);
    const remaining = db().get(`SELECT COUNT(*) n FROM publications WHERE project_id=? AND status NOT IN ('cancelled')`, pub.project_id).n;
    if (!remaining) db().run(`UPDATE content_projects SET status='approved' WHERE id=?`, pub.project_id);
    audit('publication.cancel', { userId: req.user!.id, entity: 'publication', entityId: id });
    return { ok: true };
  });
  app.post('/api/publications/:id/retry', editor, async (req) => {
    const id = Number((req.params as any).id);
    const r = db().run(`UPDATE publications SET status='scheduled', block_reasons='[]', updated_at=datetime('now') WHERE id=? AND status IN ('blocked','failed')`, id);
    if (!r.changes) throw new PermanentError('Apenas publicações bloqueadas ou com falha podem ser reenviadas');
    audit('publication.retry', { userId: req.user!.id, entity: 'publication', entityId: id });
    return { ok: true };
  });

  // ---------------- Analytics ----------------
  app.get('/api/analytics', viewer, async (req) => analyticsSummary(Math.min(90, Number((req.query as any).days ?? 30))));

  // ---------------- Configurações ----------------
  app.get('/api/settings', viewer, async () => ({ settings: getSettings(), brand: getBrand(), niches: NICHES, stages: STAGES }));
  app.put('/api/settings', admin, async (req) => {
    const b = req.body as Partial<Settings>;
    const allowed = Object.keys(DEFAULT_SETTINGS).filter((k) => !['production_mode', 'publishing_paused'].includes(k)) as (keyof Settings)[];
    const freq = z.object({ reels_per_day: z.number().int().min(0).max(3), feed_per_day: z.number().int().min(0).max(3), stories_min: z.number().int().min(0).max(10), stories_max: z.number().int().min(0).max(10) });
    const hhmm = z.string().regex(/^\d{2}:\d{2}$/);
    for (const k of allowed) {
      if (!(k in b)) continue;
      const v: any = (b as any)[k];
      if (k === 'frequency') freq.parse(v);
      if (k === 'routine') z.object({ trend_research: hhmm, trend_analysis: hhmm, strategy: hhmm, copywriting: hhmm, creative: hhmm, metrics: hhmm, weekly_report_weekday: z.number().int().min(0).max(6) }).parse(v);
      if (k === 'publish_times') z.object({ reel: hhmm, feed: hhmm, stories: z.array(hhmm).max(10) }).parse(v);
      if (k === 'publish_window') z.object({ start: hhmm, end: hhmm }).parse(v);
      setSetting(k, v);
    }
    audit('settings.update', { userId: req.user!.id, details: Object.keys(b) });
    return getSettings();
  });
  app.put('/api/brand', admin, async (req) => {
    const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
    const b = z.object({
      brand_name: z.string().min(1).optional(), handle: z.string().nullable().optional(), niche: z.string().optional(), audience: z.string().nullable().optional(), tone: z.string().optional(),
      colors: z.object({ background: hex, surface: hex, primary: hex, accent: hex, text: hex, muted: hex }).optional(),
      fonts: z.object({ heading: z.string(), body: z.string(), headingWeight: z.number(), bodyWeight: z.number() }).optional(),
      layout: z.record(z.string(), z.any()).optional(), base_hashtags: z.array(z.string()).optional(), forbidden_words: z.array(z.string()).optional(), rules: z.array(z.string()).optional(),
    }).parse(req.body);
    audit('brand.update', { userId: req.user!.id, details: Object.keys(b) });
    return updateBrand(b as any);
  });

  // ---------------- Segurança operacional ----------------
  app.post('/api/emergency/pause', editor, async (req) => emergencyPause(req.user!.id, (req.body as any)?.reason));
  app.post('/api/emergency/resume', admin, async (req) => resumePublishing(req.user!.id));
  app.get('/api/production', viewer, async () => ({ ...productionChecklist(), production_mode: getSettings().production_mode }));
  app.post('/api/production', admin, async (req) => {
    const b = z.object({ enabled: z.boolean(), confirmation: z.string().default('') }).parse(req.body);
    return setProductionMode(b.enabled, b.confirmation, req.user!.id);
  });
  app.get('/api/audit', admin, async () => db().all(`SELECT a.*, u.email FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 200`).map((r) => parseRow(r, ['details'])));

  // ---------------- Integrações / Instagram ----------------
  app.get('/api/integrations', viewer, async () => {
    const acc = getActiveAccount();
    return {
      integrations: db().all(`SELECT * FROM integrations`).map((r) => parseRow(r, ['details'])),
      account: acc ? { ...parseRow(acc, ['permissions', 'eligibility', 'niche_suggestion']), access_token_enc: undefined } : null,
      oauthConfigured: !!(env().META_APP_ID && env().META_APP_SECRET && env().META_REDIRECT_URI),
    };
  });
  app.post('/api/integrations/check', admin, async () => checkIntegrations());
  app.get('/api/instagram/oauth/start', admin, async (req, reply) => {
    const { url, state } = oauthStartUrl();
    reply.setCookie('sai_oauth_state', state, { ...cookieOptions(), sameSite: 'lax', maxAge: 600 });
    return { url };
  });
  app.get('/api/instagram/oauth/callback', admin, async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error_description?: string };
    if (q.error_description) return reply.redirect(`/#/integracoes?erro=${encodeURIComponent(q.error_description)}`);
    if (!q.code || !q.state || q.state !== req.cookies.sai_oauth_state || !verifyState(q.state)) return reply.code(400).send({ error: 'Estado OAuth inválido' });
    reply.clearCookie('sai_oauth_state', { path: '/' });
    await completeOAuth(q.code);
    audit('instagram.connect', { userId: req.user!.id });
    return reply.redirect('/#/integracoes?conectado=1');
  });
  app.post('/api/instagram/connect-env-token', admin, async (req) => {
    if (!env().IG_ACCESS_TOKEN) throw new PermanentError('IG_ACCESS_TOKEN não definida no ambiente');
    const r = await connectWithToken(env().IG_ACCESS_TOKEN!, null, env().IG_USER_ID);
    audit('instagram.connect_env', { userId: req.user!.id });
    return r;
  });
  app.post('/api/instagram/verify', admin, async () => verifyAccount());
  app.post('/api/instagram/confirm-permissions', admin, async (req) => {
    const acc = getActiveAccount();
    if (!acc) throw new PermanentError('Nenhuma conta conectada');
    confirmPermissions(acc.id);
    audit('instagram.confirm_permissions', { userId: req.user!.id });
    return { ok: true };
  });
  app.post('/api/instagram/analyze-niche', admin, async () => analyzeNiche());
  app.post('/api/instagram/niche', admin, async (req) => {
    const b = z.object({ niche: z.string().min(3), audience: z.string().optional() }).parse(req.body);
    audit('instagram.niche', { userId: req.user!.id, details: b });
    return confirmNiche(b.niche, b.audience);
  });
  app.post('/api/instagram/disconnect', admin, async (req) => {
    const acc = getActiveAccount();
    if (acc) disconnectAccount(acc.id);
    setSetting('production_mode', false);
    audit('instagram.disconnect', { userId: req.user!.id });
    return { ok: true };
  });
}
