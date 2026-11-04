// Renderiza quadros avulsos para revisão: node tools/stills.mjs 30 75 120 ...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const browserExecutable = process.env.REMOTION_BROWSER;
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || 'Apresentacao', browserExecutable });
for (const f of process.argv.slice(2).map(Number)) {
  await renderStill({ composition, serveUrl, frame: f, output: `out/stills/f${String(f).padStart(4, '0')}.jpg`, imageFormat: 'jpeg', jpegQuality: 80, browserExecutable });
  console.log('ok', f);
}
