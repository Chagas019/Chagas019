// Render determinístico (adaptado de 05_motion/src/render.js): Playwright → PNG por quadro → FFmpeg.
// Uso: node render.js <cena.html> "<query>" <saida.mp4> <W> <H> [--dur S] [--still t1,t2,...]
//   Injeta window.__BEATMAP (09_audio/analise/beatmap.json) e window.__ENERGIA (08_visualizer/data/energia.json)
//   se existirem. Encode combinado: libx264 high, yuv420p, 30fps, CRF 20, maxrate 12M, preset slow, tune grain, faststart. Mudo.
//   --still: só exporta PNGs dos tempos dados (QA de quadros-chave), sem vídeo.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../../');
const SCRATCH = process.env.SCRATCH || '/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad';

const [sceneArg, query = '', outArg, Ws, Hs, ...rest] = process.argv.slice(2);
const opt = {}; for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1];
const scene = path.resolve(sceneArg), out = path.resolve(outArg), W = +Ws, H = +Hs;
const FR = path.join(SCRATCH, 'frames_' + path.basename(out).replace(/\W+/g, '_'));
const readIf = p => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;

(async () => {
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const bm = readIf(path.join(ROOT, '09_audio/analise/beatmap.json'));
  const en = readIf(path.join(ROOT, '08_visualizer/data/energia.json'));
  await page.addInitScript(`window.__BEATMAP = ${bm || 'null'}; window.__ENERGIA = ${en || 'null'};`);
  page.on('pageerror', e => console.error('PAGEERROR', e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('CONSOLE', m.text()); });
  await page.goto('file://' + scene + '?render=1&w=' + W + '&h=' + H + (query ? '&' + query : ''));
  await page.evaluate(() => window.ready);
  const info = await page.evaluate(() => ({ fps: window.FPS, dur: window.DURATION, cues: window.CUES && { fonte: CUES.fonte, bpm: CUES.bpm, trechoInicio: CUES.trechoInicio } }));
  console.log(path.basename(out), JSON.stringify(info));
  const clip = { x: 0, y: 0, width: W, height: H };
  if (opt.still) {
    for (const t of opt.still.split(',').map(Number)) {
      await page.evaluate(t => window.seek(t), t);
      await page.screenshot({ path: out.replace(/\.(mp4|png)$/, '') + `_t${t.toFixed(2)}.png`, clip });
    }
    await browser.close(); fs.rmSync(FR, { recursive: true, force: true }); return;
  }
  const dur = opt.dur ? +opt.dur : info.dur, fps = info.fps, n = Math.round(fps * dur);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.seek(t), i / fps);
    await page.screenshot({ path: path.join(FR, `f${String(i).padStart(5, '0')}.jpg`), clip, type: 'jpeg', quality: 96 });
    if (i % 60 === 0) process.stdout.write(`${path.basename(out)} ${i}/${n}\n`);
  }
  await browser.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(FR, 'f%05d.jpg'),
    '-vf', 'scale=in_range=full:out_range=tv', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-preset', 'slow', '-tune', 'grain', '-movflags', '+faststart', '-an', out], { stdio: 'inherit' });
  fs.rmSync(FR, { recursive: true, force: true });
  console.log('OK', out, n, 'quadros');
})();
