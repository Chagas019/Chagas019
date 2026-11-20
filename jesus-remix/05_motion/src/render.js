// Render determinístico: Playwright → PNG por quadro → FFmpeg (H.264, yuv420p, CRF 18)
// Uso: node render.js [cena.html] [saida.mp4] [largura] [altura]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');

const scene = path.resolve(__dirname, process.argv[2] || 'abertura.html');
const out = path.resolve(__dirname, process.argv[3] || '../render/proposta_abertura_1080x1080.mp4');
const W = +(process.argv[4] || 1080), H = +(process.argv[5] || 1080);
const FRAMES_DIR = process.env.FRAMES_DIR || '/tmp/claude-0/-home-user-Chagas019/5aa60b56-731f-5adb-8191-fe8ed32b4067/scratchpad/frames';

(async () => {
  fs.rmSync(FRAMES_DIR, { recursive: true, force: true }); fs.mkdirSync(FRAMES_DIR, { recursive: true });
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto('file://' + scene + '?render=1');
  await page.evaluate(() => window.ready);
  const { fps, dur } = await page.evaluate(() => ({ fps: window.FPS, dur: window.DURATION }));
  const n = Math.round(fps * dur);
  const stage = await page.$('#stage');
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.seek(t), i / fps);
    await stage.screenshot({ path: path.join(FRAMES_DIR, `f${String(i).padStart(5, '0')}.png`) });
    if (i % 30 === 0) process.stdout.write(`frame ${i}/${n}\n`);
  }
  await browser.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(FRAMES_DIR, 'f%05d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log('OK', out, n, 'frames');
})();
