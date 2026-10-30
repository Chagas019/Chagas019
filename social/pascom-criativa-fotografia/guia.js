// Gera GUIA.md a partir de posts.js: node guia.js
const fs = require('fs');
const POSTS = require('./posts.js');
const clean = s => (s || '').replace(/\*(.+?)\*/g, '$1').replace(/_(.+?)_/g, '$1');

const text = s => {
  switch (s.L) {
    case 'cover': return '';
    case 'list': return `**${clean(s.h)}**\n\n` + s.items.map(([b, p], i) => `${i + 1}. **${clean(b)}**${p ? ` — ${clean(p)}` : ''}`).join('\n');
    case 'diagram': return `**${clean(s.h)}**\n\n` + s.notes.map(([b, p]) => `- **${b}:** ${clean(p)}`).join('\n');
    case 'compare': return `**${clean(s.h)}**\n\n- ✕ Assim não: ${s.bad.notes.join('; ')}\n- ✓ Assim sim: ${s.good.notes.join('; ')}`;
    case 'split': return `**${s.n} — ${clean(s.h)}**\n\n${clean(s.body)}`;
    case 'statement': return `**${clean(s.q)}**\n\n${clean(s.body)}`;
    case 'table': return `**${clean(s.h)}**\n\n` + s.cols.map(c => `- **${c.t}:** ` + c.rows.map(([k, v]) => `${k}: ${clean(v)}`).join(' · ')).join('\n') + (s.note ? `\n\n_${clean(s.note)}_` : '');
    case 'grid': return `**${clean(s.h)}**\n\n` + s.cells.map(c => `- ${c.n} · ${clean(c.t)}`).join('\n');
    case 'timeline': return `**${clean(s.h)}**\n\n` + s.steps.map(([m, t]) => `- **${m}:** ${clean(t)}`).join('\n');
    case 'cta': return `**${clean(s.q)}**\n\n${clean(s.sub)}` + (s.chips ? `\n\nRespostas rápidas: ${s.chips.join(' · ')}` : '');
  }
};
const COVERS = {
  '01': 'A MELHOR FOTO DA MISSA / é a que ninguém viu você tirar.',
  '02': '5 · ÂNGULOS QUE TRANSFORMAM SUAS FOTOS',
  '03': 'Na adoração, o escuro também é a foto.',
  '04': 'Ele não aproxima. Ele recorta e estraga a foto. / 10× / PARE DE USAR O ZOOM DIGITAL.',
  '05': 'QUEM CHEGA ATRASADO FOTOGRAFA COSTAS.',
  '06': '3 · ERROS QUE TODO FOTÓGRAFO DA PASCOM COMETE (inclusive eu)',
  '07': 'O momento mais importante da missa pede o clique mais discreto.',
  '08': 'SEU CELULAR TEM CONFIGURAÇÕES QUE VOCÊ NUNCA ABRIU. / HDR · Foco + exposição · Lente',
  '09': 'UMA FOTO BONITA MOSTRA. / Uma foto boa conta.',
  '10': 'A missa também acontece nos bancos. / VIRA A CÂMERA.'
};

let md = `# PASCOM CRIATIVA — Fotografia na Igreja

Coleção de 10 carrosséis para Instagram (1080×1350, 4:5). Texto, direção de arte, fotos sugeridas, legenda e pergunta de cada post. Este arquivo é gerado a partir de \`posts.js\` com \`node guia.js\`.

## Identidade visual

- **Conceito:** revista de fotografia + manual técnico de câmera. Cada post parece uma página de revista independente com anotações de revisor por cima.
- **Cores:** preto profundo \`#0D0D0C\`, papel \`#E8E4DA\`, amarelo \`#FFC21A\` (destaque, marca-texto, marcações) e cinza \`#8F8B82\` (informação secundária). Os três fundos se alternam dentro de cada carrossel para dar ritmo.
- **Tipografia:** Anton (títulos, condensada pesada), Archivo Narrow (texto), Instrument Serif (frases de respiro, em itálico) e JetBrains Mono (anotações técnicas, rótulos, leituras do visor).
- **Linguagem gráfica:** cópias fotográficas com cantos de visor e leitura de exposição, plantas baixas, réguas de zoom, fotômetro, diagramas de luz e de movimento, caneta amarela de revisão (círculos, setas, X), comparações ASSIM NÃO / ASSIM SIM, granulação e dobra de papel.
- **Assinatura:** marca de visor com ponto amarelo + **PASCOM CRIATIVA** no topo de todo slide; assinatura completa (*Fotografia • Comunicação • Evangelização*) só no último slide de cada post.
- **Imagens:** as cenas são ilustrações documentais em SVG (não fotos inventadas) e funcionam sozinhas. Para a versão com fotos reais, siga a pauta de cada post.

`;
POSTS.forEach(p => {
  md += `---\n\n## Nº${p.n} — ${p.title}\n\n`;
  p.slides.forEach((s, i) => {
    md += `### Slide ${i + 1}${s.L === 'cover' ? ' · capa' : ''}\n\n`;
    md += (s.L === 'cover' ? `**${COVERS[p.n]}**` : (s.k ? `_${s.k}_\n\n` : '') + text(s)) + `\n\n> **Direção de arte:** ${s.art}\n\n`;
  });
  md += `### Fotos sugeridas (para fotografar na sua paróquia)\n\n${p.photos.map(f => `- ${f}`).join('\n')}\n\n`;
  md += `### Legenda\n\n${p.caption.split('\n').map(l => l ? `> ${l}` : '>').join('\n')}\n>\n> #Pascom #PascomCriativa #FotografiaCatólica #ComunicaçãoCatólica #Evangelização\n\n`;
  md += `### Pergunta para os comentários\n\n**${p.question}**\n\n`;
});
fs.writeFileSync(__dirname + '/GUIA.md', md);
console.log('GUIA.md ok');
