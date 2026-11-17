// Renderiza stills de conferência do agente PEÇAS. Uso: node scripts/preview-pecas/render.mjs <saida> [frame]
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {getCompositions, renderStill} from '@remotion/renderer';
const raiz = path.resolve(import.meta.dirname, '../..');
const saida = process.argv[2];
const frame = Number(process.argv[3] ?? 120);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const serveUrl = await bundle({entryPoint: path.join(raiz, 'scripts/preview-pecas/index.tsx'), publicDir: path.join(raiz, 'public')});
const comps = await getCompositions(serveUrl, {browserExecutable});
for (const c of comps) {
  await renderStill({serveUrl, composition: c, frame, output: path.join(saida, `${c.id}.png`), browserExecutable, scale: 0.5});
  console.log('ok', c.id);
}
