// Renderiza um intervalo de quadros a 60 fps e envia para o ffmpeg
const { chromium } = require('playwright');
const { spawn } = require('child_process'); const path = require('path');
(async () => {
  const [a, b, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
  const FPS = 60;
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const br = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, 'render.html'));
  await p.evaluate(() => window.ready);
  for (let f = a; f < b; f++) {
    const d = await p.evaluate(t => window.grab(t, .95), f / FPS);
    const buf = Buffer.from(d.split(',')[1], 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 120 === 0) console.log(out, f);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await br.close();
})();
