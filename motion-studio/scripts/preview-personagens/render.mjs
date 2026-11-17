// Stills dos previews de personagens. Uso: node scripts/preview-personagens/render.mjs <Id> <f1,f2,...> [gl]
// gl: angle | swangle | swiftshader | egl | vulkan (padrão: swangle — único que cria WebGL neste container).
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [id, lista = '0', gl = 'swangle'] = process.argv.slice(2);
const raiz = path.resolve(import.meta.dirname, '../..');
const headless = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(headless) ? headless : null;
const chromiumOptions = {gl};
const serveUrl = await bundle({entryPoint: path.join(import.meta.dirname, 'index.ts'), publicDir: path.join(raiz, 'public')});
const comp = await selectComposition({serveUrl, id, browserExecutable, chromiumOptions});
const dir = path.join(raiz, 'render/revisao', id);
fs.mkdirSync(dir, {recursive: true});
for (const frame of lista.split(',').map(Number)) {
  const output = path.join(dir, `frame-${String(frame).padStart(4, '0')}-${gl}.png`);
  await renderStill({serveUrl, composition: comp, frame, output, browserExecutable, chromiumOptions, scale: 0.5});
  console.log('ok', path.relative(raiz, output));
}
