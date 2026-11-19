import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, json } from '../db/db.js';
import { storagePath } from '../config/env.js';
import { getBrand, getSettings } from '../db/repo.js';
import { getImageGen } from '../integrations/imagegen/provider.js';
import { renderReel } from '../integrations/media/ffmpeg.js';
import { randomToken, sha256 } from '../security/crypto.js';
import { carouselSlideSvg, feedImageSvg, reelCoverSvg, reelSceneSvg, storySvg, type Rendered } from '../creative/templates.js';
import { brandContrastIssues, checkImage, checkVideo, scoreIssues, type Issue, type QualityResult } from '../quality/visual.js';
import { checkCopy } from '../quality/copy.js';
import { latestCaption } from './copywriter.js';
import { runAgent, type AgentContext } from './base.js';
import type { Brand } from '../creative/brandDefaults.js';

export function mediaDir() {
  const d = storagePath('media');
  fs.mkdirSync(d, { recursive: true });
  return d;
}

async function svgToJpeg(r: Rendered, file: string) {
  await sharp(Buffer.from(r.svg), { density: 72 }).resize(r.w, r.h).flatten({ background: '#000' }).jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(file);
}

function saveAsset(projectId: number, kind: string, position: number, file: string, mime: string, q: QualityResult, source: string, extra: { width?: number; height?: number; duration?: number } = {}) {
  const buf = fs.readFileSync(file);
  getDb().run(
    `INSERT INTO media_assets (project_id, kind, position, file_name, mime, width, height, duration_seconds, size_bytes, sha256, quality_score, quality_issues, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    projectId, kind, position, path.basename(file), mime, extra.width ?? null, extra.height ?? null, extra.duration ?? null,
    buf.length, sha256(buf), q.score, JSON.stringify(q.issues), source,
  );
}

async function backgroundFor(prompt: string, ctx: AgentContext, size: '1024x1536' | '1024x1024'): Promise<string | undefined> {
  const gen = getImageGen();
  if (!gen || !prompt) return undefined;
  try {
    const buf = await gen.generate(`${prompt}. Fotografia original, estética editorial, sem texto, sem marcas d'água, sem logotipos.`, size);
    const q = await sharp(buf).stats();
    if (q.entropy < 3) {
      ctx.log('warn', 'Imagem gerada descartada (baixa informação visual)');
      return undefined;
    }
    const jpg = await sharp(buf).jpeg({ quality: 88 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString('base64')}`;
  } catch (e: any) {
    ctx.log('warn', `Geração de imagem indisponível: ${e.message} — usando composição tipográfica`);
    return undefined;
  }
}

const newName = (ext: string) => `${randomToken(18)}.${ext}`;

async function renderImageAsset(projectId: number, kind: string, position: number, r: Rendered, mk: 'feed' | 'story', minScore: number, extraIssues: Issue[], source: string) {
  const file = path.join(mediaDir(), newName('jpg'));
  await svgToJpeg(r, file);
  const issues = [...extraIssues];
  if (r.overflow) issues.push({ code: 'text_overflow', severity: 'major', message: 'Texto excede a área de composição' });
  const q = await checkImage(file, mk, minScore, issues);
  saveAsset(projectId, kind, position, file, 'image/jpeg', q, source, { width: r.w, height: r.h });
  return q;
}

/** Produz todas as mídias de um projeto e aplica a revisão automática de qualidade. */
export async function produceProject(projectId: number, ctx: AgentContext) {
  const db = getDb();
  const p = db.get('SELECT * FROM content_projects WHERE id = ?', projectId);
  if (!p) throw new Error(`Projeto ${projectId} não encontrado`);
  db.run(`UPDATE content_projects SET status='rendering', updated_at=datetime('now') WHERE id=?`, projectId);
  db.run(`DELETE FROM media_assets WHERE project_id = ?`, projectId);

  const brand: Brand = getBrand();
  const s = getSettings();
  const min = s.quality.min_score;
  const script = json.parse<any>(p.script, {});
  const slides = json.parse<any[]>(p.slides, []);
  const stories = json.parse<any[]>(p.stories, []);
  const brandIssues = brandContrastIssues(brand.colors);
  const results: QualityResult[] = [];

  if (p.format === 'IMAGE') {
    const bg = await backgroundFor(script.visual_prompt, ctx, '1024x1536');
    const r = feedImageSvg(brand, { kicker: script.kicker ?? 'Dica', headline: script.image?.headline ?? p.title, sub: script.image?.subheadline }, bg);
    results.push(await renderImageAsset(projectId, 'image', 0, r, 'feed', min, brandIssues, bg ? 'image_gen+template' : 'template'));
  }

  if (p.format === 'CAROUSEL') {
    if (slides.length < 2 || slides.length > 10) throw new Error(`Carrossel precisa de 2 a 10 slides (recebido ${slides.length})`);
    for (let i = 0; i < slides.length; i++) {
      const kind = i === 0 ? 'cover' : i === slides.length - 1 ? 'cta' : 'content';
      const r = carouselSlideSvg(brand, { index: i, total: slides.length, title: slides[i].title, body: slides[i].body, kind, kicker: script.kicker });
      results.push(await renderImageAsset(projectId, 'slide', i, r, 'feed', min, brandIssues, 'template'));
    }
  }

  if (p.format === 'STORIES') {
    if (!stories.length) throw new Error('Sequência de stories vazia');
    for (let i = 0; i < stories.length; i++) {
      const r = storySvg(brand, { text: stories[i].text, kicker: stories[i].kicker ?? undefined, prompt: stories[i].interaction_prompt ?? undefined });
      results.push(await renderImageAsset(projectId, 'story', i, r, 'story', min, brandIssues, 'template'));
    }
  }

  if (p.format === 'REELS') {
    const scenes: any[] = script.scenes ?? [];
    if (!scenes.length) throw new Error('Roteiro do Reel sem cenas');
    const bg = await backgroundFor(script.visual_prompt, ctx, '1024x1536');
    // Capa
    const cover = reelCoverSvg(brand, { title: script.cover_title ?? p.title, kicker: script.kicker ?? 'Reel' }, bg);
    results.push(await renderImageAsset(projectId, 'cover', 0, cover, 'story', min, brandIssues, bg ? 'image_gen+template' : 'template'));
    // Quadros das cenas
    const tmp = fs.mkdtempSync(path.join(mediaDir(), 'tmp-'));
    try {
      const inputs: { image: string; duration: number }[] = [];
      const overflowIssues: Issue[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const sc = scenes[i];
        const r = reelSceneSvg(brand, { text: sc.on_screen_text, emphasis: sc.emphasis ?? undefined, index: i, total: scenes.length }, i === 0 ? bg : undefined);
        if (r.overflow) overflowIssues.push({ code: 'text_overflow', severity: 'major', message: `Cena ${i + 1}: texto excede a área` });
        const f = path.join(tmp, `scene-${i}.png`);
        await sharp(Buffer.from(r.svg)).resize(r.w, r.h).png().toFile(f);
        inputs.push({ image: f, duration: Math.max(1.5, Math.min(8, Number(sc.end) - Number(sc.start) || 3)) });
      }
      const musicDir = storagePath('music');
      const tracks = fs.existsSync(musicDir) ? fs.readdirSync(musicDir).filter((x) => /\.(mp3|m4a|aac|wav)$/i.test(x)) : [];
      const music = tracks.length ? path.join(musicDir, tracks[projectId % tracks.length]) : undefined;
      const out = path.join(mediaDir(), newName('mp4'));
      const { duration } = await renderReel(inputs, out, { music });
      const vq = await checkVideo(out, min);
      vq.issues.push(...overflowIssues);
      Object.assign(vq, scoreIssues(vq.issues, min));
      saveAsset(projectId, 'video', 1, out, 'video/mp4', vq, music ? 'ffmpeg+music' : 'ffmpeg', { width: 1080, height: 1920, duration });
      results.push(vq);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  // Revisão de copy junto com a mídia
  const cap = latestCaption(projectId);
  const copyIssues = cap
    ? checkCopy({ hook: cap.hook, body: cap.body, cta: cap.cta, hashtags: json.parse(cap.hashtags, []), fullText: cap.full_text },
        { maxHashtags: s.publishing_rules.max_hashtags, maxLength: s.publishing_rules.max_caption_length, forbidden: [...brand.forbidden_words, ...s.publishing_rules.blocked_terms] })
    : [{ code: 'empty_caption', severity: 'critical' as const, message: 'Sem legenda' }];
  const copyScore = scoreIssues(copyIssues, min);
  const mediaScore = results.length ? Math.min(...results.map((r) => r.score)) : 0;
  const passed = results.length > 0 && results.every((r) => r.passed) && copyScore.passed;
  const report = { passed, score: Math.min(mediaScore, copyScore.score), media: results.map((r) => ({ score: r.score, passed: r.passed, issues: r.issues })), copy: copyIssues, checked_at: new Date().toISOString() };
  const status = passed ? (s.require_human_approval ? 'review' : 'approved') : 'rejected';
  db.run(`UPDATE content_projects SET status=?, quality_report=?, requires_human_review=?, updated_at=datetime('now') WHERE id=?`,
    status, JSON.stringify(report), s.require_human_approval ? 1 : 0, projectId);
  ctx.log(passed ? 'info' : 'warn', `Projeto #${projectId} (${p.format}) — QA ${report.score}/100 → ${status}`);
  return { projectId, status, score: report.score };
}

/** 10:00 — Renderiza e valida todas as mídias do dia. */
export async function produceDay(date: string, jobId?: number) {
  return runAgent('creative_studio', { date }, async (ctx) => {
    const projects = getDb().all(
      `SELECT p.id FROM content_projects p JOIN editorial_calendar c ON c.id = p.calendar_id WHERE c.date = ? AND p.status IN ('copy_ready','rejected','failed')`, date,
    );
    const out = [];
    for (const { id } of projects) {
      try {
        out.push(await produceProject(id, ctx));
      } catch (e: any) {
        getDb().run(`UPDATE content_projects SET status='failed', quality_report=?, updated_at=datetime('now') WHERE id=?`, JSON.stringify({ error: e.message }), id);
        ctx.log('error', `Falha ao produzir projeto #${id}: ${e.message}`);
        out.push({ projectId: id, status: 'failed', error: e.message });
      }
    }
    return { produced: out };
  }, jobId);
}

export async function produceSingle(projectId: number, jobId?: number) {
  return runAgent('creative_studio', { projectId }, (ctx) => produceProject(projectId, ctx), jobId);
}
