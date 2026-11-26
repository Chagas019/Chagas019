// Renderiza vários stills de uma composição com UM bundle só (QA visual rápido).
// Uso: node scripts/qa-stills.mjs <CompId> <frame,frame,...> [scale=0.5] [prefixo]
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [id, framesArg, scaleArg = '0.5', prefix = id] = process.argv.slice(2);
if (!id || !framesArg) {
  console.log('uso: node scripts/qa-stills.mjs <CompId> <f1,f2,...> [scale] [prefixo]');
  process.exit(1);
}
const browserExecutable = process.env.REMOTION_CHROME ?? '/opt/pw-browsers/chromium';
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comp = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions: { gl: 'swangle' } });
fs.mkdirSync('out/qa', { recursive: true });
for (const f of framesArg.split(',').map(Number)) {
  const out = `out/qa/${prefix}-${f}.png`;
  const t = Date.now();
  await renderStill({ serveUrl, composition: comp, frame: f, output: out, scale: Number(scaleArg), browserExecutable, chromiumOptions: { gl: 'swangle' }, overwrite: true });
  console.log(out, `${Date.now() - t}ms`);
}
