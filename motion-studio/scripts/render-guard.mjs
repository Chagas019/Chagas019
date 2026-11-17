// Render final H.264 — BLOQUEADO até aprovação humana. Dono: agente CÓDIGO.
// Uso: npm run render -- <ComposicaoId>
// Requer o arquivo aprovacoes/<ComposicaoId>.aprovado criado PELO USUÁRIO (ex.: "aprovado por <nome> em <data>").
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const id = process.argv[2];
const raiz = path.resolve(import.meta.dirname, '..');
if (!id) {
  console.error('Informe a composição: npm run render -- Demo-Vertical');
  process.exit(1);
}
const aprovacao = path.join(raiz, 'aprovacoes', `${id}.aprovado`);
if (!fs.existsSync(aprovacao)) {
  console.error(`✗ Render bloqueado: falta aprovação humana (${path.relative(raiz, aprovacao)}).`);
  console.error('  Revise no Studio (npm run studio) e, se aprovar, crie esse arquivo.');
  process.exit(2);
}
fs.mkdirSync(path.join(raiz, 'render/saida'), {recursive: true});
const out = path.join(raiz, 'render/saida', `${id}.mp4`);
execFileSync('npx', ['remotion', 'render', 'src/index.ts', id, out, '--codec=h264', '--crf=18', '--pixel-format=yuv420p', '--audio-codec=aac'], {cwd: raiz, stdio: 'inherit'});
console.log('✓', path.relative(raiz, out));
