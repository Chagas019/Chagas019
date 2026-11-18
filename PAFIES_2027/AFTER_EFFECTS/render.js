/* Render Queue — PAFIES 2027
   node render.js stills 1.2,3.8,...   -> PNGs de QA em ../PREVIEW/stills
   node render.js video [sub] [out]    -> MP4 H.264 1080x1920 30fps com audio
*/
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const R = path.resolve(__dirname, '..');
const uri = (f, mime) => `data:${mime};base64,` + fs.readFileSync(path.join(R, f)).toString('base64');
const font64 = fs.readFileSync(path.join(R, 'ASSETS/fonts/Anton-Regular.ttf')).toString('base64');
const svg = f => { let s = fs.readFileSync(path.join(R, 'ILLUSTRATOR', f), 'utf8'); if (s.includes('<text')) s = s.replace('<defs>', `<defs><style>@font-face{font-family:Anton;src:url(data:font/ttf;base64,${font64})}</style>`); return 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64'); };
const assets = {
  font: `data:font/ttf;base64,${font64}`,
  img: {
    letters: { src: uri('ASSETS/logo_pafies_letters.png', 'image/png') },
    badge: { src: uri('ASSETS/logo_pafies_badge.png', 'image/png') },
    megafone: { src: uri('ASSETS/megafone_halftone.png', 'image/png') },
    raioA: { src: svg('raio_3d_A.svg'), w: 700 }, raioB: { src: svg('raio_3d_B.svg'), w: 800 }, raioC: { src: svg('raio_3d_C.svg'), w: 600 },
    arroz: { src: svg('alimento_arroz.svg'), w: 600 }, maca: { src: svg('alimento_maca.svg'), w: 600 }, lata: { src: svg('alimento_lata.svg'), w: 600 },
    leite: { src: svg('alimento_leite.svg'), w: 600 }, pao: { src: svg('alimento_pao.svg'), w: 600 }, banana: { src: svg('alimento_banana.svg'), w: 600 },
  },
};
const cues = JSON.parse(fs.readFileSync(path.join(R, 'AUDIO/cues.json')));

(async () => {
  const mode = process.argv[2] || 'stills';
  const b = await chromium.launch({ args: ['--disable-gpu-vsync'] });
  const p = await b.newPage({ viewport: { width: 540, height: 960 } });
  await p.setContent(`<canvas id="c"></canvas><script>${fs.readFileSync(path.join(__dirname, 'engine.js'), 'utf8')}</script>`);
  console.log('assets:', await p.evaluate(([a, c]) => window.boot(a, c), [assets, cues]));
  if (mode === 'stills') {
    const dir = path.join(R, 'PREVIEW/stills'); fs.mkdirSync(dir, { recursive: true });
    for (const s of (process.argv[3] || '1.5').split(',')) {
      const f = Math.round(parseFloat(s) * 30);
      const d = await p.evaluate(f => window.renderFrame(f, 1, 'image/jpeg', .9), f);
      fs.writeFileSync(path.join(dir, `t${s.padStart(5, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    }
  } else {
    const sub = parseInt(process.argv[3] || '3'), out = process.argv[4] || path.join(R, 'RENDERS/PAFIES_2027_campanha_1080x1920.mp4');
    const total = Math.round(cues.duracao * 30);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-c:v', 'mjpeg', '-i', '-',
      '-i', path.join(R, 'AUDIO/trilha_mix.wav'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      const d = await p.evaluate(([f, s]) => window.renderFrame(f, s, 'image/jpeg', .95), [f, sub]);
      if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 60 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log('ok', out);
  }
  await b.close();
})();
