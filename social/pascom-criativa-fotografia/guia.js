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
const TECH = ['floorplan', 'camera', 'phone', 'lensbar', 'meter', 'route', 'panning', 'silho', 'height', 'sensor', 'shake'];
const COVER_ART = {
  '02': 'Um 5 gigante vazado ao fundo, os cinco ângulos listados em condensada com números em mono amarelo e uma nota à mão: “nenhum exige câmera nova”.',
  '03': 'Fotômetro técnico no topo marcando −1, um “−1” gigante em contorno amarelo, nota à mão e a frase em serifada.',
  '04': 'Régua de zoom com as lentes reais em amarelo, “10×” gigante riscado à mão e o título em condensada preta sobre amarelo.',
  '05': 'Mapa técnico do trajeto da procissão com as posições 1, 2 e 3, nota à mão “corre por fora!” e o título cortando a parte de baixo.',
  '06': '3 gigante vazado, os três erros listados com X desenhados à mão, título em condensada e “(inclusive eu)” em serifada.',
  '07': 'Visor de câmera vazio no centro do preto, só com o quadrado de foco amarelo e a leitura de exposição, e a frase em serifada.',
  '09': 'Tira de filme desenhada com três quadros vazios (contexto, personagem, detalhe), o último circulado a lápis amarelo, e a frase em serifada.',
  '10': 'Dois visores vazios: o de cima, “o altar. de novo.”, riscado com um X; uma seta amarela de 180° leva ao de baixo, “as pessoas”, circulado. Título VIRA A CÂMERA.'
};
const artOf = (p, s) => {
  if (s.L === 'cover') return COVER_ART[p.n] || s.art;
  if (s.L === 'compare') return 'Bloco ASSIM NÃO em contorno, com o texto riscado em amarelo, e bloco ASSIM SIM em amarelo sólido. Só tipografia, sem imagem.';
  if (s.L === 'split') return 'Número vazado gigante, título, configuração de partida num quadro como leitura de visor, observação escrita à mão e diagrama da altura da câmera.';
  if (s.L === 'grid') return 'Blocos tipográficos numerados com contorno, sem imagem.';
  if (s.L === 'diagram' && !TECH.includes(s.d.s)) return 'Dicas em linhas grandes e pontos de atenção escritos à mão, sem imagem.';
  if (s.L === 'diagram' && s.f2) return 'Diagrama técnico de luz: fonte de luz, pessoa e a posição do fotógrafo.';
  if (s.L === 'statement' && s.f && !TECH.includes(s.f.s)) return 'Frase grande em serifada e texto curto de apoio, sem imagem.';
  return s.art;
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

Coleção de 10 carrosséis de 8 slides para Instagram (1080×1350, 4:5). Texto, direção de arte, fotos sugeridas, legenda e pergunta de cada post. Este arquivo é gerado a partir de \`posts.js\` com \`node guia.js\`.

## Identidade visual

- **Conceito:** revista de fotografia + manual técnico de câmera. Cada post parece uma página de revista independente com anotações de revisor por cima.
- **Cores:** preto profundo \`#0D0D0C\`, papel \`#E8E4DA\`, amarelo \`#FFC21A\` (destaque, marca-texto, marcações) e cinza \`#8F8B82\` (informação secundária). Os três fundos se alternam dentro de cada carrossel para dar ritmo.
- **Tipografia:** Anton (títulos, condensada pesada), Archivo Narrow (texto), Instrument Serif (frases de respiro, em itálico) e JetBrains Mono (anotações técnicas, rótulos, leituras do visor).
- **Linguagem gráfica:** leituras de visor, plantas baixas, réguas de zoom, fotômetro, diagramas de luz e de movimento, caneta amarela de revisão (círculos, setas, X), comparações ASSIM NÃO / ASSIM SIM, granulação e dobra de papel.
- **Toque humano:** círculos, setas e X desenhados à mão (traço torto de verdade), rótulos em letra de caneta (Caveat), comentários curtos em primeira pessoa, fita adesiva nas fotos e dobra de papel. É o que tira a cara de template.\n- **Assinatura:** marca de visor com ponto amarelo + **PASCOM CRIATIVA** no topo de todo slide, ao lado de @chagas_catolico; assinatura completa (*Fotografia • Comunicação • Evangelização*) só no último slide de cada post.
- **Imagens:** nenhuma imagem de exemplo. Os posts são só dicas: tipografia, diagramas técnicos e anotações à mão.

`;
POSTS.forEach(p => {
  md += `---\n\n## Nº${p.n} — ${p.title}\n\n`;
  p.slides.forEach((s, i) => {
    md += `### Slide ${i + 1}${s.L === 'cover' ? ' · capa' : ''}\n\n`;
    md += (s.L === 'cover' ? `**${COVERS[p.n]}**` : (s.k ? `_${s.k}_\n\n` : '') + text(s)) + `\n\n> **Direção de arte:** ${artOf(p, s)}\n\n`;
  });
  const nxt = POSTS[POSTS.indexOf(p) + 1];
  md += `### Slide ${p.slides.length + 1} · siga para mais dicas\n\n_Antes de ir embora_\n\n**curtiu? ME SEGUE PRA MAIS DICAS DE FOTOGRAFIA NA IGREJA.**\n\nCartão do perfil: foto, Chagas | Pascom, @chagas_catolico, botão Seguir.\n\n${nxt ? `Próximo da coleção → Nº${nxt.n} · ${nxt.title}` : 'Presets que dão vida às suas fotos: @chagas_photon_'}\n\n> **Direção de arte:** “curtiu?” escrito à mão em amarelo, chamada em condensada, cartão do perfil com anel amarelo e um gancho para o próximo post da coleção, que puxa a pessoa para o seu feed.\n\n`;
  md += `### Pauta de fotos (opcional, se um dia quiser usar fotos suas)\n\n${p.photos.map(f => `- ${f}`).join('\n')}\n\n`;
  md += `### Legenda\n\n${p.caption.split('\n').map(l => l ? `> ${l}` : '>').join('\n')}\n>\n> #Pascom #PascomCriativa #FotografiaCatólica #ComunicaçãoCatólica #Evangelização\n\n`;
  md += `### Pergunta para os comentários\n\n**${p.question}**\n\n`;
});
fs.writeFileSync(__dirname + '/GUIA.md', md);
console.log('GUIA.md ok');
