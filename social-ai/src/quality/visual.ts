import sharp, { type Metadata } from 'sharp';
import fs from 'node:fs';
import { probe } from '../integrations/media/ffmpeg.js';

export type Severity = 'critical' | 'major' | 'minor';
export interface Issue { code: string; severity: Severity; message: string }
export interface QualityResult { score: number; passed: boolean; issues: Issue[]; meta: Record<string, unknown> }

const PENALTY: Record<Severity, number> = { critical: 100, major: 25, minor: 8 };

export function scoreIssues(issues: Issue[], minScore: number) {
  const score = Math.max(0, 100 - issues.reduce((a, i) => a + PENALTY[i.severity], 0));
  return { score, passed: score >= minScore && !issues.some((i) => i.severity === 'critical') };
}

// ---------- Contraste (WCAG 2.1) ----------
function lum(hex: string) {
  const h = hex.replace('#', '');
  const rgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Requisitos oficiais da Content Publishing API (resumo):
 *  Imagem: JPEG, até 8 MB, proporção entre 4:5 e 1.91:1, largura 320–1440 px.
 *  Stories (imagem): JPEG, 9:16 recomendado.
 *  Reels: MP4/MOV, H.264, yuv420p, AAC ≤48 kHz, 23–60 fps, 9:16 recomendado, 3 s a 15 min, até 300 MB.
 */
export async function checkImage(file: string, kind: 'feed' | 'story', minScore = 80, extra: Issue[] = []): Promise<QualityResult> {
  const issues: Issue[] = [...extra];
  if (!fs.existsSync(file)) return { score: 0, passed: false, issues: [{ code: 'missing', severity: 'critical', message: 'Arquivo inexistente' }], meta: {} };
  let meta: Metadata;
  try {
    meta = await sharp(file).metadata();
  } catch (e: any) {
    return { score: 0, passed: false, issues: [{ code: 'corrupt', severity: 'critical', message: `Arquivo corrompido: ${e.message}` }], meta: {} };
  }
  const size = fs.statSync(file).size;
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const ratio = w / h;
  if (meta.format !== 'jpeg') issues.push({ code: 'format', severity: 'critical', message: `Formato ${meta.format}; a API exige JPEG` });
  if (size > 8 * 1024 * 1024) issues.push({ code: 'size', severity: 'critical', message: 'Arquivo maior que 8 MB' });
  if (w < 1080) issues.push({ code: 'resolution', severity: w < 320 ? 'critical' : 'major', message: `Largura ${w}px (recomendado 1080px)` });
  if (kind === 'feed' && (ratio < 0.8 - 0.005 || ratio > 1.91)) issues.push({ code: 'aspect', severity: 'critical', message: `Proporção ${ratio.toFixed(3)} fora de 4:5–1.91:1` });
  if (kind === 'story' && Math.abs(ratio - 9 / 16) > 0.01) issues.push({ code: 'aspect', severity: 'major', message: `Proporção ${ratio.toFixed(3)} (story ideal 9:16)` });

  // Detecção de imagem vazia/chapada e de baixa nitidez.
  const stats = await sharp(file).stats();
  const avgStdev = stats.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;
  if (stats.entropy < 1.5 || avgStdev < 6) issues.push({ code: 'blank', severity: 'critical', message: 'Imagem praticamente vazia/sem detalhes' });
  const edges = await sharp(file).greyscale().resize(540).convolve({ width: 3, height: 3, kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0] }).stats();
  const sharpness = edges.channels[0].stdev;
  if (sharpness < 2) issues.push({ code: 'blur', severity: 'major', message: `Baixa nitidez (índice ${sharpness.toFixed(2)})` });

  const { score, passed } = scoreIssues(issues, minScore);
  return { score, passed, issues, meta: { width: w, height: h, format: meta.format, sizeBytes: size, entropy: stats.entropy, sharpness } };
}

export async function checkVideo(file: string, minScore = 80, limits = { minDuration: 3, maxDuration: 90 }): Promise<QualityResult> {
  const issues: Issue[] = [];
  const p = await probe(file);
  if (!p.ok) return { score: 0, passed: false, issues: [{ code: 'corrupt', severity: 'critical', message: `Vídeo ilegível: ${p.error ?? 'sem stream de vídeo'}` }], meta: { ...p } };
  if (p.videoCodec !== 'h264' && p.videoCodec !== 'hevc') issues.push({ code: 'codec', severity: 'critical', message: `Codec ${p.videoCodec} não suportado` });
  if (p.pixFmt !== 'yuv420p') issues.push({ code: 'pixfmt', severity: 'major', message: `pix_fmt ${p.pixFmt} (esperado yuv420p)` });
  if (!p.audioCodec) issues.push({ code: 'audio', severity: 'major', message: 'Sem faixa de áudio' });
  else if (p.audioCodec !== 'aac') issues.push({ code: 'audio_codec', severity: 'critical', message: `Áudio ${p.audioCodec} (esperado AAC)` });
  if (p.audioSampleRate && p.audioSampleRate > 48000) issues.push({ code: 'audio_rate', severity: 'critical', message: 'Taxa de amostragem acima de 48 kHz' });
  if ((p.fps ?? 0) < 23 || (p.fps ?? 0) > 60) issues.push({ code: 'fps', severity: 'critical', message: `${p.fps} fps fora de 23–60` });
  if (p.duration < limits.minDuration || p.duration > limits.maxDuration) issues.push({ code: 'duration', severity: 'critical', message: `Duração ${p.duration.toFixed(1)}s fora de ${limits.minDuration}–${limits.maxDuration}s` });
  if (p.width && p.height && Math.abs(p.width / p.height - 9 / 16) > 0.01) issues.push({ code: 'aspect', severity: 'major', message: `Proporção ${p.width}x${p.height} (ideal 9:16)` });
  if ((p.width ?? 0) < 720) issues.push({ code: 'resolution', severity: 'major', message: `Resolução baixa (${p.width}px)` });
  if (p.sizeBytes > 300 * 1024 * 1024) issues.push({ code: 'size', severity: 'critical', message: 'Arquivo acima de 300 MB' });
  const { score, passed } = scoreIssues(issues, minScore);
  return { score, passed, issues, meta: { ...p } };
}

/** Checagem de identidade: contraste das cores principais da marca. */
export function brandContrastIssues(colors: { background: string; text: string; muted: string }): Issue[] {
  const issues: Issue[] = [];
  const main = contrastRatio(colors.text, colors.background);
  const muted = contrastRatio(colors.muted, colors.background);
  if (main < 4.5) issues.push({ code: 'contrast', severity: 'major', message: `Contraste texto/fundo ${main.toFixed(2)}:1 (< 4.5:1)` });
  if (muted < 3) issues.push({ code: 'contrast_muted', severity: 'minor', message: `Contraste texto secundário ${muted.toFixed(2)}:1 (< 3:1)` });
  return issues;
}
