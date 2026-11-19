import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { getDb, json, nowIso } from '../db/db.js';
import { audit, getActiveAccount, getBrand, getSettings, setSetting } from '../db/repo.js';
import { graphClientFor } from '../integrations/instagram/account.js';
import type { GraphClient } from '../integrations/instagram/graph.js';
import { GraphApiError, PermanentError, isRetryable } from '../lib/errors.js';
import { addDays, timeToMinutes, zonedParts, zonedToUtc } from '../lib/time.js';
import { checkCopy } from '../quality/copy.js';
import { sha256 } from '../security/crypto.js';
import { mediaDir } from './creativeStudio.js';
import { latestCaption } from './copywriter.js';
import { runAgent } from './base.js';
import { cancelJobs, enqueue } from '../orchestrator/queue.js';

const ACTIVE = `('scheduled','publishing','retrying','published')`;

export function publicMediaUrl(fileName: string) {
  return `${env().PUBLIC_BASE_URL.replace(/\/$/, '')}/media/public/${fileName}`;
}

function assetsOf(projectId: number) {
  return getDb().all('SELECT * FROM media_assets WHERE project_id = ? ORDER BY kind, position', projectId);
}

export function contentHash(mediaType: string, assetShas: string[], caption: string) {
  return sha256(`${mediaType}|${[...assetShas].sort().join(',')}|${caption.replace(/\s+/g, ' ').trim().toLowerCase()}`);
}

/** Calcula o horário UTC respeitando a janela de publicação. */
export function resolveSchedule(date: string, time: string, now = new Date()) {
  const s = getSettings();
  const tz = s.timezone;
  let at = zonedToUtc(date, time, tz);
  if (at.getTime() < now.getTime()) at = new Date(now.getTime() + 5 * 60_000);
  const local = zonedParts(at, tz);
  const mins = timeToMinutes(local.time);
  if (mins < timeToMinutes(s.publish_window.start)) at = zonedToUtc(local.date, s.publish_window.start, tz);
  if (mins > timeToMinutes(s.publish_window.end)) at = zonedToUtc(addDays(local.date, 1), s.publish_window.start, tz);
  return at;
}

/** Agenda um projeto aprovado. Stories geram uma publicação por tela (a API publica um story por container). */
export function scheduleProject(projectId: number, opts: { at?: Date; userId?: number } = {}) {
  const db = getDb();
  const p = db.get('SELECT p.*, c.date, c.scheduled_time FROM content_projects p LEFT JOIN editorial_calendar c ON c.id = p.calendar_id WHERE p.id = ?', projectId);
  if (!p) throw new PermanentError('Projeto não encontrado');
  if (p.status !== 'approved') throw new PermanentError(`Projeto precisa estar aprovado (status atual: ${p.status})`);
  const caption = latestCaption(projectId);
  const assets = assetsOf(projectId);
  const s = getSettings();
  const account = getActiveAccount();
  const created: number[] = [];
  const blocked: string[] = [];

  const insert = (mediaType: string, ids: number[], shas: string[], at: Date) => {
    const hash = contentHash(mediaType, shas, mediaType === 'STORIES' ? '' : caption?.full_text ?? '');
    const dup = db.get(`SELECT id, status FROM publications WHERE content_hash = ? AND status IN ${ACTIVE}`, hash);
    if (dup) {
      blocked.push(`Conteúdo duplicado (publicação #${dup.id}, ${dup.status})`);
      return;
    }
    const r = db.run(
      `INSERT INTO publications (project_id, account_id, media_type, scheduled_at, caption_id, content_hash, asset_ids) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      projectId, account?.id ?? null, mediaType, at.toISOString(), caption?.id ?? null, hash, JSON.stringify(ids),
    );
    created.push(r.lastId);
  };

  db.tx(() => {
    if (p.format === 'STORIES') {
      const stories = assets.filter((a) => a.kind === 'story');
      const n = Math.min(Math.max(stories.length, 0), s.frequency.stories_max);
      for (let i = 0; i < n; i++) {
        const time = s.publish_times.stories[i] ?? s.publish_times.stories.at(-1)!;
        insert('STORIES', [stories[i].id], [stories[i].sha256], opts.at ? new Date(opts.at.getTime() + i * 60_000) : resolveSchedule(p.date, time));
      }
    } else {
      const at = opts.at ?? resolveSchedule(p.date, p.scheduled_time);
      const use = p.format === 'REELS' ? assets.filter((a) => a.kind === 'video' || a.kind === 'cover') : assets;
      insert(p.format === 'REELS' ? 'REELS' : p.format === 'CAROUSEL' ? 'CAROUSEL' : 'IMAGE', use.map((a) => a.id), use.map((a) => a.sha256), at);
    }
    if (created.length) {
      db.run(`UPDATE content_projects SET status='scheduled', updated_at=datetime('now') WHERE id=?`, projectId);
      db.run(`UPDATE editorial_calendar SET status='scheduled' WHERE project_id=?`, projectId);
    }
  });
  audit('publication.schedule', { userId: opts.userId, entity: 'project', entityId: projectId, details: { created, blocked } });
  return { created, blocked };
}

export interface GateResult { ok: boolean; reasons: string[] }

/** Todas as travas que impedem publicação automática. Nenhuma pode ser ignorada. */
export function publishGates(pub: any): GateResult {
  const reasons: string[] = [];
  const e = env();
  const s = getSettings();
  if (e.NODE_ENV === 'test') reasons.push('Ambiente de teste — publicação real desativada');
  if (!e.ALLOW_PUBLISHING) reasons.push('ALLOW_PUBLISHING=false (trava de infraestrutura)');
  if (!s.production_mode) reasons.push('Modo de produção desligado');
  if (s.publishing_paused) reasons.push('Publicações pausadas (botão de emergência)');
  if (!/^https:\/\//.test(e.PUBLIC_BASE_URL)) reasons.push('PUBLIC_BASE_URL HTTPS não configurada');

  const acc = pub.account_id ? getDb().get('SELECT * FROM instagram_accounts WHERE id = ?', pub.account_id) : getActiveAccount();
  if (!acc || acc.status !== 'connected') reasons.push('Integração com o Instagram indisponível');
  else {
    if (!acc.permissions_confirmed) reasons.push('Permissões da conta não confirmadas');
    if (!json.parse<string[]>(acc.permissions, []).includes('instagram_content_publish')) reasons.push('Permissão instagram_content_publish ausente');
  }

  const project = getDb().get('SELECT * FROM content_projects WHERE id = ?', pub.project_id);
  if (!project || !['scheduled', 'approved'].includes(project.status)) reasons.push(`Projeto em status inválido (${project?.status ?? 'inexistente'})`);
  const qr = json.parse<any>(project?.quality_report, {});
  if (!qr.passed) reasons.push('Projeto não aprovado na revisão de qualidade');

  const ids = json.parse<number[]>(pub.asset_ids, []);
  const assets = ids.map((id) => getDb().get('SELECT * FROM media_assets WHERE id = ?', id)).filter(Boolean);
  if (!assets.length || assets.length !== ids.length) reasons.push('Mídia ausente');
  for (const a of assets) {
    const f = path.join(mediaDir(), a.file_name);
    if (!fs.existsSync(f)) reasons.push(`Arquivo ausente: ${a.file_name}`);
    else if (sha256(fs.readFileSync(f)) !== a.sha256) reasons.push(`Arquivo corrompido/alterado: ${a.file_name}`);
    if (json.parse<any[]>(a.quality_issues, []).some((i) => i.severity === 'critical')) reasons.push(`Mídia fora dos requisitos: ${a.file_name}`);
  }
  if (pub.media_type === 'CAROUSEL' && (assets.length < 2 || assets.length > 10)) reasons.push('Carrossel deve ter 2–10 itens');
  if (pub.media_type === 'REELS' && !assets.some((a) => a.kind === 'video')) reasons.push('Reel sem vídeo');

  if (pub.media_type !== 'STORIES') {
    const cap = pub.caption_id ? getDb().get('SELECT * FROM captions WHERE id = ?', pub.caption_id) : null;
    if (!cap?.full_text?.trim()) reasons.push('Legenda vazia');
    else {
      const brand = getBrand();
      const crit = checkCopy({ hook: cap.hook, body: cap.body, cta: cap.cta, hashtags: json.parse(cap.hashtags, []), fullText: cap.full_text },
        { maxHashtags: s.publishing_rules.max_hashtags, maxLength: s.publishing_rules.max_caption_length, forbidden: [...brand.forbidden_words, ...s.publishing_rules.blocked_terms] })
        .filter((i) => i.severity === 'critical');
      for (const i of crit) reasons.push(`Regra violada: ${i.message}`);
    }
    // Espaçamento mínimo entre posts de feed
    const minH = s.publishing_rules.min_hours_between_feed_posts;
    const near = getDb().get(
      `SELECT id FROM publications WHERE status='published' AND media_type IN ('IMAGE','CAROUSEL') AND id <> ?
       AND ABS(strftime('%s', published_at) - strftime('%s', 'now')) < ? AND ? IN ('IMAGE','CAROUSEL')`,
      pub.id, minH * 3600, pub.media_type,
    );
    if (near) reasons.push(`Intervalo mínimo de ${minH}h entre posts de feed não respeitado`);
  }
  const dup = getDb().get(`SELECT id FROM publications WHERE content_hash = ? AND status = 'published' AND id <> ?`, pub.content_hash, pub.id);
  if (dup) reasons.push(`Conteúdo duplicado (já publicado em #${dup.id})`);
  return { ok: reasons.length === 0, reasons };
}

async function createContainers(client: GraphClient, igId: string, pub: any, assets: any[], caption: string) {
  const url = (a: any) => publicMediaUrl(a.file_name);
  switch (pub.media_type) {
    case 'IMAGE':
      return client.createContainer(igId, { image_url: url(assets[0]), caption });
    case 'STORIES': {
      const a = assets[0];
      return client.createContainer(igId, a.mime.startsWith('video') ? { media_type: 'STORIES', video_url: url(a) } : { media_type: 'STORIES', image_url: url(a) });
    }
    case 'REELS': {
      const video = assets.find((a) => a.kind === 'video');
      const cover = assets.find((a) => a.kind === 'cover');
      return client.createContainer(igId, { media_type: 'REELS', video_url: url(video), cover_url: cover ? url(cover) : undefined, caption, share_to_feed: true });
    }
    case 'CAROUSEL': {
      const children: string[] = [];
      for (const a of [...assets].sort((x, y) => x.position - y.position)) {
        const id = await client.createContainer(igId, a.mime.startsWith('video') ? { media_type: 'VIDEO', video_url: url(a), is_carousel_item: true } : { image_url: url(a), is_carousel_item: true });
        await client.waitContainer(id);
        children.push(id);
      }
      return client.createContainer(igId, { media_type: 'CAROUSEL', children, caption });
    }
    default:
      throw new PermanentError(`Tipo de mídia não suportado: ${pub.media_type}`);
  }
}

/** Publica uma publicação agendada, com idempotência (nunca publica duas vezes). */
export async function publishOne(pubId: number, opts: { jobId?: number; client?: GraphClient } = {}) {
  return runAgent('publisher', { publicationId: pubId }, async (ctx) => {
    const db = getDb();
    const pub = db.get('SELECT * FROM publications WHERE id = ?', pubId);
    if (!pub) throw new PermanentError('Publicação não encontrada');
    if (pub.status === 'published' || pub.ig_media_id) return { skipped: 'já publicada', mediaId: pub.ig_media_id };
    if (pub.status === 'cancelled') return { skipped: 'cancelada' };

    const gates = publishGates(pub);
    if (!gates.ok) {
      db.run(`UPDATE publications SET status='blocked', block_reasons=?, updated_at=datetime('now') WHERE id=?`, JSON.stringify(gates.reasons), pubId);
      ctx.log('warn', `Publicação #${pubId} bloqueada`, { reasons: gates.reasons });
      return { blocked: gates.reasons };
    }

    const acc = pub.account_id ? db.get('SELECT * FROM instagram_accounts WHERE id = ?', pub.account_id) : getActiveAccount();
    return performPublish(pubId, opts.client ?? graphClientFor(acc), ctx);
  }, opts.jobId);
}

/**
 * Fluxo oficial: container(s) → aguardar processamento → media_publish → permalink.
 * Só deve ser chamado depois de publishGates() aprovar (publishOne faz isso).
 */
export async function performPublish(pubId: number, client: GraphClient, ctx: { log: (l: any, m: string, d?: unknown) => void }) {
  const db = getDb();
  const pub = db.get('SELECT * FROM publications WHERE id = ?', pubId);
  const acc = pub.account_id ? db.get('SELECT * FROM instagram_accounts WHERE id = ?', pub.account_id) : getActiveAccount();
  const assets = json.parse<number[]>(pub.asset_ids, []).map((id) => db.get('SELECT * FROM media_assets WHERE id = ?', id));
  const caption = pub.caption_id ? db.get('SELECT full_text FROM captions WHERE id = ?', pub.caption_id)?.full_text ?? '' : '';
  db.run(`UPDATE publications SET status='publishing', attempts=attempts+1, block_reasons='[]', updated_at=datetime('now') WHERE id=?`, pubId);
  const attempts = pub.attempts + 1;

  try {
    // Limite oficial: até 100 posts via API por 24h (consultado, não presumido).
    const lim = await client.publishingLimit(acc.ig_user_id);
    const q = lim.data?.[0];
    if (q?.config?.quota_total && q.quota_usage >= q.config.quota_total) throw new GraphApiError('Limite de publicação de 24h atingido', 429, 4);

    let containerId: string | null = pub.container_id;
    if (containerId) {
      const st = await client.containerStatus(containerId);
      if (st.status_code === 'PUBLISHED') {
        // A tentativa anterior publicou mas a resposta se perdeu: recupera sem duplicar.
        const recent = await client.ownMedia(acc.ig_user_id, 10);
        const match = recent.data.find((m: any) => (m.caption ?? '').trim().slice(0, 60) === caption.trim().slice(0, 60));
        if (match) return finish(pubId, match.id, match.permalink, ctx);
        throw new PermanentError('Container já publicado, mas a mídia não foi localizada — verifique manualmente');
      }
      if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') containerId = null;
    }
    if (!containerId) {
      containerId = await createContainers(client, acc.ig_user_id, pub, assets, caption);
      db.run(`UPDATE publications SET container_id=? WHERE id=?`, containerId, pubId);
    }
    await client.waitContainer(containerId);
    const mediaId = await client.publishContainer(acc.ig_user_id, containerId);
    let permalink: string | null = null;
    try {
      permalink = (await client.mediaInfo(mediaId)).permalink ?? null;
    } catch {
      /* permalink é opcional */
    }
    return finish(pubId, mediaId, permalink, ctx);
  } catch (e: any) {
    const max = getSettings().retries.max_attempts;
    const retry = isRetryable(e) && attempts < max;
    db.run(`UPDATE publications SET status=?, last_error=?, updated_at=datetime('now') WHERE id=?`, retry ? 'retrying' : 'failed', String(e.message), pubId);
    if (!retry) db.run(`UPDATE content_projects SET status='failed' WHERE id=?`, pub.project_id);
    throw e;
  }
}

function finish(pubId: number, mediaId: string, permalink: string | null, ctx: { log: (l: any, m: string, d?: unknown) => void }) {
  const db = getDb();
  const pub = db.get('SELECT * FROM publications WHERE id = ?', pubId);
  db.run(`UPDATE publications SET status='published', ig_media_id=?, permalink=?, published_at=?, last_error=NULL, updated_at=datetime('now') WHERE id=?`, mediaId, permalink, nowIso(), pubId);
  const pending = db.get(`SELECT COUNT(*) n FROM publications WHERE project_id=? AND status <> 'published' AND status <> 'cancelled'`, pub.project_id)!.n;
  if (!pending) {
    db.run(`UPDATE content_projects SET status='published', updated_at=datetime('now') WHERE id=?`, pub.project_id);
    db.run(`UPDATE editorial_calendar SET status='published' WHERE project_id=?`, pub.project_id);
  }
  // Primeira coleta de métricas 24h depois.
  enqueue({ type: 'analyst.collect_one', lane: 'analyst', payload: { publicationId: pubId }, runAt: new Date(Date.now() + 24 * 3600_000), dedupeKey: `metrics:${pubId}:24h` });
  ctx.log('info', `Publicação #${pubId} publicada (${mediaId})`, { permalink });
  return { mediaId, permalink };
}

/** Enfileira publicações vencidas — respeita pausa de emergência e janela de publicação. */
export function dispatchDue(now = new Date()) {
  const s = getSettings();
  if (s.publishing_paused) return 0;
  const local = zonedParts(now, s.timezone);
  const mins = timeToMinutes(local.time);
  if (mins < timeToMinutes(s.publish_window.start) || mins > timeToMinutes(s.publish_window.end)) return 0;
  const due = getDb().all(`SELECT id, attempts FROM publications WHERE status = 'scheduled' AND scheduled_at <= ? ORDER BY scheduled_at`, now.toISOString());
  let n = 0;
  for (const p of due) {
    if (enqueue({ type: 'publisher.publish', lane: 'publisher', payload: { publicationId: p.id }, dedupeKey: `publish:${p.id}:${p.attempts}`, priority: 1 })) n++;
  }
  return n;
}

// ---------------- Controles de segurança ----------------

export function emergencyPause(userId?: number, reason = 'manual') {
  setSetting('publishing_paused', true);
  const cancelled = cancelJobs({ lane: 'publisher' });
  getDb().run(`UPDATE publications SET status='scheduled' WHERE status='retrying'`);
  audit('emergency.pause', { userId, details: { reason, cancelledJobs: cancelled } });
  return { paused: true, cancelledJobs: cancelled };
}

export function resumePublishing(userId?: number) {
  setSetting('publishing_paused', false);
  audit('emergency.resume', { userId });
  return { paused: false };
}

export function productionChecklist() {
  const e = env();
  const acc = getActiveAccount();
  const checks = [
    { key: 'allow_env', ok: e.ALLOW_PUBLISHING, label: 'Variável ALLOW_PUBLISHING=true no servidor' },
    { key: 'not_test', ok: e.NODE_ENV !== 'test', label: 'Ambiente diferente de teste' },
    { key: 'account', ok: !!acc, label: 'Conta do Instagram conectada' },
    { key: 'eligibility', ok: !!acc && json.parse<any>(acc.eligibility, {}).ok === true, label: 'Elegibilidade e permissões verificadas' },
    { key: 'confirmed', ok: !!acc?.permissions_confirmed, label: 'Permissões confirmadas pelo administrador' },
    { key: 'niche', ok: !!acc?.niche_confirmed, label: 'Nicho confirmado' },
    { key: 'public_url', ok: /^https:\/\//.test(e.PUBLIC_BASE_URL), label: 'URL pública HTTPS para as mídias' },
  ];
  return { ready: checks.every((c) => c.ok), checks };
}

export function setProductionMode(enabled: boolean, confirmation: string, userId?: number) {
  if (enabled) {
    const c = productionChecklist();
    if (!c.ready) throw new PermanentError(`Requisitos pendentes: ${c.checks.filter((x) => !x.ok).map((x) => x.label).join('; ')}`);
    if (confirmation !== 'ATIVAR PRODUÇÃO') throw new PermanentError('Digite exatamente "ATIVAR PRODUÇÃO" para confirmar');
  }
  setSetting('production_mode', enabled);
  audit(enabled ? 'production.enable' : 'production.disable', { userId });
  return { production_mode: enabled };
}
