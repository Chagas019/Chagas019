// Revisão por frames (NÃO renderiza vídeo). Dono: agente REVISÃO.
// Uso: npm run review -- <ComposicaoId> [frame1,frame2,...]
// Sem lista de frames: amostra automática (início/meio/fim de cada trecho + picos de transição).
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [id = 'Demo-Vertical', lista] = process.argv.slice(2);
const raiz = path.resolve(import.meta.dirname, '..');
const headless = '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';
const browserExecutable = fs.existsSync(headless) ? headless : null;

const serveUrl = await bundle({entryPoint: path.join(raiz, 'src/index.ts'), publicDir: path.join(raiz, 'public')});
const comp = await selectComposition({serveUrl, id, browserExecutable, chromiumOptions: {gl: 'swangle'}});
const n = comp.durationInFrames;
const frames = lista
  ? lista.split(',').map(Number)
  : [...new Set(Array.from({length: 12}, (_, i) => Math.min(n - 1, Math.round((i / 11) * (n - 1)))))];

const dir = path.join(raiz, 'render/revisao', id);
fs.rmSync(dir, {recursive: true, force: true});
fs.mkdirSync(dir, {recursive: true});
for (const frame of frames) {
  const output = path.join(dir, `frame-${String(frame).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition: comp, frame, output, browserExecutable, chromiumOptions: {gl: 'swangle'}, scale: 0.5});
  console.log('✓', path.relative(raiz, output));
}
// Folha de contato (grade) para revisão rápida
const cols = comp.width > comp.height ? 3 : 4;
const rows = Math.ceil(frames.length / cols);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-pattern_type', 'glob', '-i', path.join(dir, 'frame-*.png'),
  '-vf', `scale=iw/2:-1,tile=${cols}x${rows}:padding=8:color=0x222222`, '-frames:v', '1', path.join(dir, '_folha-de-contato.png')]);
console.log('✓ folha de contato:', path.relative(raiz, path.join(dir, '_folha-de-contato.png')));
