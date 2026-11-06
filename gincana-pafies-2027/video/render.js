// Renderiza o vídeo final quadro a quadro e junta com a trilha.
// node render.js            -> ../entregas/pafies-2027-mascote.mp4
// node render.js --frames 2,8,12  -> PNGs de conferência
const { chromium } = require('playwright');
const { execFileSync, spawn } = require('child_process');
const fs = require('fs'), path = require('path');
(async () => {
  const args = process.argv.slice(2), here = __dirname;
  const srv = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { cwd: here, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.evaluate(() => window.ready);
  const grab = async t => Buffer.from((await page.evaluate(t => { renderAt(t); return document.getElementById('c').toDataURL('image/jpeg', .93).split(',')[1]; }, t)), 'base64');
  if (args[0] === '--frames') {
    const out = process.env.OUT || path.join(here, 'quadros'); fs.mkdirSync(out, { recursive: true });
    for (const t of args[1].split(',').map(Number)) fs.writeFileSync(path.join(out, `t${t}.jpg`), await grab(t));
    await browser.close(); srv.kill(); return;
  }
  const { DUR, FPS } = await page.evaluate(() => ({ DUR, FPS }));
  const out = path.resolve(args[0] || path.join(here, '..', 'entregas', 'pafies-2027-mascote.mp4'));
  const audio = path.join(here, 'trilha-final.wav');
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(fs.existsSync(audio) ? ['-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'slow', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(DUR * FPS);
  for (let i = 0; i < total; i++) { const b = await grab(i / FPS); if (!ff.stdin.write(b)) await new Promise(r => ff.stdin.once('drain', r)); if (i % 150 === 0) console.log(`quadro ${i}/${total}`); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close(); srv.kill(); console.log('OK ->', out);
})();
