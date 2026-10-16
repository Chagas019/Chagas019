// Fonte reserva: API pública das Edições CNBB (a mesma que alimenta liturgiadiaria.edicoescnbb.com.br).
//   GET https://api-liturgia.edicoescnbb.com.br/contents/in/date/aaaa-mm-dd
// A resposta traz `content.leituras` (referências em <div>s, a 1ª é o rótulo "Leituras:"),
// `content.body` (HTML com os textos, separados por cabeçalhos) e `content.color`.
// Estrutura conforme o scraper público github.com/liturgiasaoperegrino-gif/montesenario.

export const CNBB_BASE = 'https://api-liturgia.edicoescnbb.com.br/contents/in/date';

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’' };

const decodificar = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);

/** HTML → texto com uma linha por bloco, sem os trechos escondidos (display:none). */
export function htmlParaTexto(html) {
  let s = String(html || '');
  // Remove elementos ocultos (metadados internos da CNBB) até não sobrar nenhum.
  const oculto = /<(\w+)[^>]*style\s*=\s*"[^"]*display\s*:\s*none[^"]*"[^>]*>[\s\S]*?<\/\1>/i;
  while (oculto.test(s)) s = s.replace(oculto, '');
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodificar(s)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

const MARCADORES = [
  ['primeiraLeitura', /PRIMEIRA LEITURA/i],
  ['segundaLeitura', /SEGUNDA LEITURA/i],
  ['salmo', /Salmo responsorial/i],
  ['aclamacao', /Aclama[çc][ãa]o ao Evangelho/i],
  // Só o cabeçalho que ocupa a linha (não o "EVANGELHO" de "ACLAMAÇÃO AO EVANGELHO").
  ['evangelho', /^EVANGELHO\b.*$/m],
];

function fatiar(texto) {
  const pos = [];
  for (const [nome, re] of MARCADORES) {
    const m = re.exec(texto);
    if (m) pos.push({ ini: m.index, fim: m.index + m[0].length, nome });
  }
  pos.sort((a, b) => a.ini - b.ini);
  const blocos = {};
  pos.forEach((p, i) => {
    const fimBloco = i + 1 < pos.length ? pos[i + 1].ini : texto.length;
    blocos[p.nome] = texto.slice(p.fim, fimBloco).replace(/^[\s:–—-]+/, '').trim();
  });
  return blocos;
}

function referencias(htmlLeituras) {
  const refs = [...String(htmlLeituras || '').matchAll(/<div[^>]*>([\s\S]*?)<\/div>/gi)].map((m) =>
    htmlParaTexto(m[1]).replace(/\n/g, ' '),
  );
  return refs[0] && /leituras/i.test(refs[0]) ? refs.slice(1) : refs;
}

const leitura = (referencia, texto, extra = {}) =>
  texto || referencia ? { referencia: referencia || '', titulo: '', texto: texto || '', ...extra } : null;

/** Converte a resposta da CNBB para o mesmo formato de normalizeLiturgia. */
export function normalizeCnbb(raw, dataPedida) {
  const c = raw && raw.content;
  if (!c || typeof c !== 'object') throw new Error('CNBB: resposta sem conteúdo');
  const [r1 = '', rSalmo = '', r2 = '', rEv = ''] = referencias(c.leituras);
  const b = fatiar(htmlParaTexto(c.body));
  if (!b.evangelho) throw new Error('CNBB: Evangelho não encontrado');

  const refrao = (b.salmo || '').match(/^(?:R\.|℟\.?)\s*(.+)$/m)?.[1]?.trim() ?? '';
  const detalhe = /<div[^>]*font-size:\s*26px[^>]*>([\s\S]*?)<\/div>/i.exec(c.details || '');
  let titulo = detalhe ? htmlParaTexto(detalhe[1]).replace(/\n/g, ' ') : '';
  if (/^liturgia di[áa]ria$/i.test(titulo)) titulo = '';
  const cor = String(c.color || '').trim();

  return {
    data: dataPedida,
    liturgia: titulo,
    cor: cor ? cor[0].toUpperCase() + cor.slice(1) : '',
    primeiraLeitura: leitura(r1, b.primeiraLeitura),
    salmo: leitura(rSalmo, b.salmo, { refrao }),
    segundaLeitura: r2 || b.segundaLeitura ? leitura(r2, b.segundaLeitura) : null,
    evangelho: { referencia: rEv, titulo: '', texto: b.evangelho },
  };
}
