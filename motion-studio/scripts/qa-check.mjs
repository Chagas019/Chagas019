// QA estático automático. Dono: agente REVISÃO. Uso: npm run qa
import fs from 'node:fs';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '..');
const erros = [];
const avisos = [];
const arquivos = (d) => fs.readdirSync(d, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? arquivos(path.join(d, e.name)) : [path.join(d, e.name)]));
const src = arquivos(path.join(raiz, 'src')).filter((f) => /\.(tsx?|jsx?)$/.test(f));

for (const f of src) {
  const t = fs.readFileSync(f, 'utf8');
  const rel = path.relative(raiz, f);
  if (/Math\.random\s*\(/.test(t)) erros.push(`${rel}: Math.random() proibido — use random('seed') do remotion ou @remotion/noise`);
  if (/Date\.now\s*\(|new Date\(\s*\)/.test(t)) erros.push(`${rel}: tempo de relógio não é determinístico`);
  if (/<(img|video|audio)\b/.test(t)) avisos.push(`${rel}: use <Img>/<Video>/<Html5Audio> do Remotion em vez de tags HTML cruas`);
  if (/setTimeout|setInterval|requestAnimationFrame/.test(t)) erros.push(`${rel}: animação baseada em timers — use useCurrentFrame()`);
  if (/transition:\s*['"`]|@keyframes|animation:\s*['"`]/.test(t)) erros.push(`${rel}: CSS transition/animation não é renderizável quadro a quadro`);
  for (const m of t.matchAll(/staticFile\(\s*['"`]([^'"`$]+)['"`]\s*\)/g)) {
    if (!fs.existsSync(path.join(raiz, 'public', m[1]))) erros.push(`${rel}: asset ausente public/${m[1]}`);
  }
  for (const m of t.matchAll(/arquivo:\s*'([^']+\.(?:wav|mp3|png|svg|webm|mp4))'/g)) {
    if (!fs.existsSync(path.join(raiz, 'public', m[1]))) erros.push(`${rel}: asset ausente public/${m[1]}`);
  }
}
console.log(`QA estático: ${src.length} arquivos verificados`);
avisos.forEach((a) => console.log('⚠', a));
erros.forEach((e) => console.log('✗', e));
if (erros.length) process.exit(1);
console.log('✓ nenhum erro');
