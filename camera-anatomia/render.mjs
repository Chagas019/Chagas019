// Uso:
//   node render.mjs stills 1,14,40 [--scale 1]        → shots/t_<t>.png
//   node render.mjs video out.mp4 [--from 0 --to 131 --fps 30 --scale 2]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2', '.wav': 'audio/wav' };
const server = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p.endsWith('/') ? p + 'index.html' : p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
}).listen(0);
const port = server.address().port;
const scale = +opt('scale', args[0] === 'video' ? 2 : 1);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text()); });
  page.on('pageerror', e => console.log('[pageerror]', e.stack));
  await page.goto(`http://localhost:${port}/index.html`);
  await page.waitForFunction('window.READY === true', null, { timeout: +opt('wait', 120000) });
  return page;
}

if (args[0] === 'stills') {
  const page = await newPage();
  fs.mkdirSync(path.join(ROOT, 'shots'), { recursive: true });
  for (const t of args[1].split(',').map(Number)) {
    const t0 = Date.now();
    await page.evaluate(t => window.renderAt(t), t);
    await page.screenshot({ path: path.join(ROOT, 'shots', `t_${t}.png`) });
    console.log('t', t, (Date.now() - t0) + 'ms');
  }
} else if (args[0] === 'video') {
  const out = args[1]; const fps = +opt('fps', 30);
  const page = await newPage();
  const dur = await page.evaluate('window.DURATION');
  const from = +opt('from', 0), to = +opt('to', dur);
  const n0 = Math.round(from * fps), n1 = Math.round(to * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', opt('preset', 'medium'), '-crf', opt('crf', '17'), '-pix_fmt', 'yuv420p', '-r', String(fps), out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const T = Date.now();
  for (let n = n0; n < n1; n++) {
    await page.evaluate(t => window.renderAt(t), n / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 94, timeout: 0 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((n - n0) % 30 === 0) { const el = (Date.now() - T) / 1000, k = (n - n0 + 1) / (n1 - n0); console.log(`frame ${n}/${n1}  ${el.toFixed(0)}s  eta ${(el / k - el).toFixed(0)}s`); }
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log('done', out);
}
await browser.close(); server.close();
