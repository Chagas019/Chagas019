// Render da animação de marca: Playwright (seek por quadro, 4 páginas em paralelo) → PNG → FFmpeg H.264
// Uso: node render_marca.js [WxH ...]      (padrão: 1080x1080 1080x1920 1920x1080)
// Saídas em 05_motion/render/: marca_<W>x<H>.mp4 (com áudio) e marca_<W>x<H>_sem_audio.mp4
// Encode: libx264 high yuv420p 30 fps, CRF 20, maxrate 12M / bufsize 24M, preset slow, +faststart.
// Áudio: 09_audio/original/Corte_Jesus.wav (somente leitura) recortado -ss 12.716 -t 7.2,
//        apenas afade 0,05 s nas bordas, AAC 320k.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const SCENE = path.join(__dirname, 'marca.html');
const OUT = path.join(ROOT, '05_motion/render');
const WAV = path.join(ROOT, '09_audio/original/Corte_Jesus.wav');
const SCRATCH = '/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad/marca';
const WORKERS = 4;

async function renderFormat(W, H) {
  const FR = path.join(SCRATCH, `frames_${W}x${H}`);
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu-vsync'] });
  let meta = null, errors = 0;
  const pages = [];
  for (let w = 0; w < WORKERS; w++) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on('pageerror', e => { console.error('PAGE ERROR', e.message); errors++; });
    await page.goto('file://' + SCENE + `?render=1&w=${W}&h=${H}`);
    await page.evaluate(() => window.ready);
    pages.push(page);
  }
  meta = await pages[0].evaluate(() => ({ fps: window.FPS, dur: window.DURATION, m: window.MARCA }));
  const n = Math.round(meta.fps * meta.dur);
  await Promise.all(pages.map(async (page, w) => {
    for (let i = w; i < n; i += WORKERS) {
      await page.evaluate(t => window.seek(t), i / meta.fps);
      await page.screenshot({ path: path.join(FR, `f${String(i).padStart(5, '0')}.png`), clip: { x: 0, y: 0, width: W, height: H } });
    }
  }));
  await browser.close();
  if (errors) throw new Error('erros de página');
  const silent = path.join(OUT, `marca_${W}x${H}_sem_audio.mp4`), withA = path.join(OUT, `marca_${W}x${H}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(meta.fps), '-i', path.join(FR, 'f%05d.png'),
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(meta.fps),
    '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-preset', 'slow', '-movflags', '+faststart', '-an', silent], { stdio: 'inherit' });
  const dur = n / meta.fps, ss = meta.m.AUDIO_IN;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-ss', String(ss), '-t', dur.toFixed(3), '-i', WAV,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-af', `afade=t=in:st=0:d=0.05,afade=t=out:st=${(dur - 0.05).toFixed(3)}:d=0.05`,
    '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', withA], { stdio: 'inherit' });
  console.log('OK', W + 'x' + H, n, 'quadros');
  return FR;
}

(async () => {
  const list = process.argv.slice(2).length ? process.argv.slice(2) : ['1080x1080', '1080x1920', '1920x1080'];
  for (const f of list) { const [W, H] = f.split('x').map(Number); const t0 = Date.now(); await renderFormat(W, H); console.log(((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
})().catch(e => { console.error(e); process.exit(1); });
