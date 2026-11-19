import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.js';
import { IntegrationUnavailableError } from '../../lib/errors.js';

function run(bin: string, args: string[], timeoutMs = 10 * 60_000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const t = setTimeout(() => p.kill('SIGKILL'), timeoutMs);
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', (e: any) => {
      clearTimeout(t);
      reject(e.code === 'ENOENT' ? new IntegrationUnavailableError('ffmpeg', `${bin} não encontrado`) : e);
    });
    p.on('close', (code) => {
      clearTimeout(t);
      code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${path.basename(bin)} saiu com código ${code}: ${stderr.slice(-800)}`));
    });
  });
}

export async function ffmpegVersion(): Promise<string> {
  const { stdout } = await run(env().FFMPEG_PATH, ['-version'], 10_000);
  return stdout.split('\n')[0];
}

export interface ProbeResult {
  ok: boolean;
  duration: number;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  pixFmt?: string;
  audioCodec?: string;
  audioSampleRate?: number;
  sizeBytes: number;
  error?: string;
}

export async function probe(file: string): Promise<ProbeResult> {
  const sizeBytes = fs.existsSync(file) ? fs.statSync(file).size : 0;
  try {
    const { stdout } = await run(env().FFPROBE_PATH, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', file], 60_000);
    const j = JSON.parse(stdout);
    const v = j.streams.find((s: any) => s.codec_type === 'video');
    const a = j.streams.find((s: any) => s.codec_type === 'audio');
    const [num, den] = String(v?.avg_frame_rate ?? '0/1').split('/').map(Number);
    return {
      ok: !!v,
      duration: Number(j.format?.duration ?? 0),
      width: v?.width, height: v?.height,
      fps: den ? num / den : 0,
      videoCodec: v?.codec_name, pixFmt: v?.pix_fmt,
      audioCodec: a?.codec_name, audioSampleRate: a ? Number(a.sample_rate) : undefined,
      sizeBytes,
    };
  } catch (e: any) {
    return { ok: false, duration: 0, sizeBytes, error: e.message };
  }
}

export interface SceneInput { image: string; duration: number }

/**
 * Renderiza um Reel 1080x1920 a partir de quadros (cenas): zoom suave (Ken Burns),
 * transições cross-fade, H.264 High/yuv420p, 30 fps, AAC 44.1 kHz, faststart.
 * Se houver trilha licenciada, é mixada a -16 dB com fade-out; caso contrário, áudio silencioso
 * (a biblioteca de músicas do Instagram não é acessível pela API).
 */
export async function renderReel(scenes: SceneInput[], out: string, opts: { music?: string; fade?: number } = {}) {
  if (!scenes.length) throw new Error('Nenhuma cena para renderizar');
  const fade = opts.fade ?? 0.4;
  const fps = 30;
  const args: string[] = ['-y', '-hide_banner', '-loglevel', 'error'];
  for (const s of scenes) args.push('-loop', '1', '-framerate', String(fps), '-t', s.duration.toFixed(2), '-i', s.image);
  const total = scenes.reduce((a, s) => a + s.duration, 0) - fade * (scenes.length - 1);
  const audioIdx = scenes.length;
  if (opts.music) args.push('-stream_loop', '-1', '-i', opts.music);
  else args.push('-f', 'lavfi', '-t', total.toFixed(2), '-i', 'anullsrc=r=44100:cl=stereo');

  const parts: string[] = [];
  scenes.forEach((s, i) => {
    const frames = Math.ceil(s.duration * fps);
    parts.push(
      `[${i}:v]scale=1188:2112,zoompan=z='min(1+0.0009*on,1.08)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${fps},trim=end_frame=${frames},setsar=1,format=yuv420p[v${i}]`,
    );
  });
  let last = 'v0';
  let offset = scenes[0].duration - fade;
  for (let i = 1; i < scenes.length; i++) {
    const label = `x${i}`;
    parts.push(`[${last}][v${i}]xfade=transition=fade:duration=${fade}:offset=${offset.toFixed(3)}[${label}]`);
    last = label;
    offset += scenes[i].duration - fade;
  }
  const audioFilter = opts.music
    ? `[${audioIdx}:a]volume=-16dB,afade=t=out:st=${Math.max(0, total - 1.5).toFixed(2)}:d=1.5,atrim=end=${total.toFixed(2)}[aout]`
    : `[${audioIdx}:a]anull[aout]`;
  parts.push(audioFilter);

  args.push(
    '-filter_complex', parts.join(';'),
    '-map', `[${last}]`, '-map', '[aout]',
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-b:v', '6M', '-maxrate', '8M', '-bufsize', '12M',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-ac', '2',
    '-t', total.toFixed(2), '-movflags', '+faststart', out,
  );
  await run(env().FFMPEG_PATH, args);
  return { duration: total };
}
