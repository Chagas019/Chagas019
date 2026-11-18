// node comp.js <ini> <fim> <saida.mp4|pasta-para-jpg>
const { chromium } = require('playwright');
const { spawn } = require('child_process'); const path = require('path'); const fs = require('fs');
(async () => {
  const [a, b, out] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
  const stills = !out.endsWith('.mp4');
  let ff;
  if (!stills) ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  else fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const p = await br.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + path.resolve(__dirname, 'comp.html')); await p.evaluate(() => window.ready);
  for (let i = a; i < b; i++) {
    const d = await p.evaluate(i => window.frame(i), i);
    const buf = Buffer.from(d.split(',')[1], 'base64');
    if (stills) fs.writeFileSync(`${out}/c_${String(i).padStart(4, '0')}.jpg`, buf);
    else if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  if (!stills) { ff.stdin.end(); await new Promise(r => ff.on('close', r)); }
  await br.close();
})();
