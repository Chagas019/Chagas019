// Renderiza o animatic quadro a quadro (1080x1920, 30 fps) e monta o MP4 com ffmpeg.
// Uso: node render.js [saida.mp4] [fps]   — também: node render.js --frames 0,6.9,13,20,26 (só PNGs de conferência)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const args = process.argv.slice(2);
  const here = __dirname;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(here, 'index.html'));
  await page.waitForFunction(() => document.fonts.ready.then(() => true));
  await page.evaluate(() => new Promise(r => { const i = new Image(); i.onload = r; i.src = 'mascote.jpg'; }));
  const stage = await page.$('#stage');

  if (args[0] === '--frames') {
    const outDir = path.join(here, '..', 'entregas', 'quadros');
    fs.mkdirSync(outDir, { recursive: true });
    for (const t of args[1].split(',').map(Number)) {
      await page.evaluate(t => renderAt(t), t);
      await stage.screenshot({ path: path.join(outDir, `t${String(t).replace('.', '_')}.png`) });
    }
    await browser.close();
    return;
  }

  const out = path.resolve(args[0] || path.join(here, '..', 'entregas', 'animatic-pafies-2027.mp4'));
  const fps = Number(args[1] || 30);
  const dur = await page.evaluate(() => window.DUR);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pafies-'));
  const total = Math.round(dur * fps);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => renderAt(t), i / fps);
    await stage.screenshot({ path: path.join(tmp, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
    if (i % 90 === 0) console.log(`quadro ${i}/${total}`);
  }
  await browser.close();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync('ffmpeg', ['-y', '-framerate', String(fps), '-i', path.join(tmp, 'f%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', out], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('OK ->', out);
})();
