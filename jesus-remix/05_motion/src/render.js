// Render determinístico: Playwright (seek por quadro) → PNG → FFmpeg H.264
// Uso:
//   node render.js <cena.html> <saida.mp4> <L> <A> [--audio arquivo.wav]
//   node render.js --stills <cena.html> <L> <A> <t1,t2,...> <pasta>      (QA: quadros soltos)
// Encode (combinado com o cliente): libx264 high, yuv420p, 30 fps, CRF 20, maxrate 12M / bufsize 24M,
// preset slow, tune grain, +faststart. Áudio (opcional): original copiado → AAC 320k, -shortest.
// Cenas em loop expõem window.LOOP = true: o render verifica se seek(DURATION) == seek(0).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const SCRATCH = process.env.FRAMES_ROOT || '/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad';

async function open(scene, W, H) {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 2; });
  const [file, qs] = scene.split('?');   // aceita parâmetros extras: cena.html?modo=longa
  await page.goto('file://' + path.resolve(__dirname, file) + `?render=1&w=${W}&h=${H}` + (qs ? '&' + qs : ''));
  await page.evaluate(() => window.ready);
  return { browser, page };
}
const shot = (page, W, H, file) => page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });

(async () => {
  const a = process.argv.slice(2);
  if (a[0] === '--stills') {
    const [, scene, w, h, times, dir] = a; const W = +w, H = +h;
    fs.mkdirSync(dir, { recursive: true });
    const { browser, page } = await open(scene, W, H);
    for (const t of times.split(',').map(Number)) {
      await page.evaluate(t => window.seek(t), t);
      await shot(page, W, H, path.join(dir, `${path.basename(scene.split('?')[0], '.html')}_${W}x${H}_t${t.toFixed(3)}.png`));
    }
    await browser.close(); return;
  }
  const scene = a[0] || 'abertura.html';
  const out = path.resolve(__dirname, a[1] || '../render/motion_principal_1080x1080.mp4');
  const W = +(a[2] || 1080), H = +(a[3] || 1080);
  const ai = a.indexOf('--audio'); const audio = ai >= 0 ? path.resolve(__dirname, a[ai + 1]) : null;
  const FR = path.join(SCRATCH, 'frames_' + path.basename(out, '.mp4'));
  fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true });

  const { browser, page } = await open(scene, W, H);
  const { fps, dur, loop } = await page.evaluate(() => ({ fps: window.FPS, dur: window.DURATION, loop: !!window.LOOP }));
  const n = Math.round(fps * dur);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.seek(t), i / fps);
    await shot(page, W, H, path.join(FR, `f${String(i).padStart(5, '0')}.png`));
    if (i % 60 === 0) process.stdout.write(`${path.basename(out)} ${i}/${n}\n`);
  }
  if (loop) { // quadro "n" (= t DURATION) deve ser idêntico ao quadro 0
    await page.evaluate(t => window.seek(t), n / fps);
    await shot(page, W, H, path.join(FR, 'loopcheck.png'));
  }
  await browser.close();

  fs.mkdirSync(path.dirname(out), { recursive: true });
  const video = audio ? path.join(FR, 'video.mp4') : out;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(FR, 'f%05d.png'),
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(fps),
    '-crf', '20', '-maxrate', '12M', '-bufsize', '24M', '-preset', 'slow', '-tune', 'grain',
    '-movflags', '+faststart', '-an', video], { stdio: 'inherit' });
  if (audio) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  }
  if (loop) {
    try {
      const r = require('child_process').spawnSync('ffmpeg', ['-hide_banner', '-i', path.join(FR, 'f00000.png'), '-i', path.join(FR, 'loopcheck.png'), '-lavfi', 'psnr', '-f', 'null', '-']);
      const m = r.stderr.toString().match(/average:(\S+)/); console.log('LOOP psnr(seek(0), seek(DURATION)) =', m ? m[1] : '?');
    } catch (e) { console.log('loopcheck falhou', e.message); }
  }
  if (!process.env.KEEP_FRAMES) fs.rmSync(FR, { recursive: true, force: true });
  console.log('OK', out, n, 'quadros');
})();
