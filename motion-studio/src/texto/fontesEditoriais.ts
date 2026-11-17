// Fontes editoriais/cinematográficas (projeto "confie-em-cristo" e futuros). Dono: agente TEXTO.
// Locais em public/fontes (render offline). Licença: SIL Open Font License 1.1 (Oswald, Cormorant Garamond).
//  - impacto:   Oswald (variável, eixo wght 200–700) -> usamos 600/700. Condensada, caixa alta, caráter de cartaz de cinema.
//  - editorial: Cormorant Garamond 500 itálico (frases contemplativas) + 600 normal (versalete/referência).
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {metricasFe, type FonteMedida} from './metricasFe';

loadFont({family: 'Oswald', url: staticFile('fontes/Oswald-var-latin.woff2'), weight: '200 700', format: 'woff2', display: 'block'});
loadFont({family: 'Cormorant Garamond', url: staticFile('fontes/CormorantGaramond-500i-latin.woff2'), weight: '500', style: 'italic', format: 'woff2', display: 'block'});
loadFont({family: 'Cormorant Garamond', url: staticFile('fontes/CormorantGaramond-600-latin.woff2'), weight: '600', style: 'normal', format: 'woff2', display: 'block'});

export const fontesFe = {
  impacto: '"Oswald", "Arial Narrow", sans-serif',
  editorial: '"Cormorant Garamond", Georgia, serif',
} as const;

/** Escala (px em base 1080; multiplique por `unidade()`). Valores já conferidos contra a largura útil do vertical (908px). */
export const escalaFe = {
  gigante: 280, // "CONFIE." ocupa ~880px no vertical
  impactoHero: 168, // 1 palavra longa por linha ("RESPOSTAS." = 828px)
  impacto: 132, // 2 palavras curtas por linha
  impactoMenor: 96,
  editorialHero: 88,
  editorial: 64,
  editorialMenor: 48, // mínimo legível no celular
  referencia: 34, // "JOÃO 14,6" em versalete com tracking aberto
} as const;

/** Largura (em `em`) de um texto, com tracking em em por caractere. Determinístico (tabela medida). */
export const larguraEm = (texto: string, fonte: FonteMedida, trackingEm = 0) => {
  const t = metricasFe[fonte];
  let w = 0;
  for (const c of texto) w += (t[c] ?? t.M ?? 0.6) + trackingEm;
  return w;
};

/** Largura em px. */
export const larguraPx = (texto: string, fonte: FonteMedida, tamanho: number, trackingEm = 0) => larguraEm(texto, fonte, trackingEm) * tamanho;

/**
 * Maior tamanho (<= `tamanho`) em que TODAS as palavras cabem sozinhas em `maxLargura`
 * (com `folga` de segurança, padrão 4%). Garante que nenhuma palavra estoura a largura.
 */
export const tamanhoQueCabe = (palavras: string[], fonte: FonteMedida, tamanho: number, maxLargura: number, trackingEm = 0, folga = 0.04) => {
  const maior = Math.max(0.01, ...palavras.map((p) => larguraEm(p, fonte, trackingEm)));
  return Math.min(tamanho, (maxLargura * (1 - folga)) / maior);
};

/**
 * Quebra de linha controlada. `quebras` = índices de palavras APÓS as quais quebrar (manual, tem prioridade).
 * Sem `quebras`: algoritmo guloso por largura medida. Retorna listas de índices por linha.
 */
export const quebrarLinhas = (
  palavras: string[],
  fonte: FonteMedida,
  tamanho: number,
  maxLargura: number,
  {quebras, gapEm = 0.25, trackingEm = 0}: {quebras?: number[]; gapEm?: number; trackingEm?: number} = {},
): number[][] => {
  const linhas: number[][] = [];
  if (quebras) {
    let atual: number[] = [];
    palavras.forEach((_, i) => {
      atual.push(i);
      if (quebras.includes(i)) {
        linhas.push(atual);
        atual = [];
      }
    });
    if (atual.length) linhas.push(atual);
    return linhas;
  }
  let atual: number[] = [];
  let w = 0;
  palavras.forEach((p, i) => {
    const wp = larguraPx(p, fonte, tamanho, trackingEm);
    const add = atual.length ? gapEm * tamanho + wp : wp;
    if (atual.length && w + add > maxLargura) {
      linhas.push(atual);
      atual = [i];
      w = wp;
    } else {
      atual.push(i);
      w += add;
    }
  });
  if (atual.length) linhas.push(atual);
  return linhas;
};

/** Reduz `tamanho` até que todas as `linhas` (já quebradas) caibam em `maxLargura` (com folga). */
export const tamanhoQueCabeLinhas = (
  textos: string[],
  linhas: number[][],
  fonte: FonteMedida,
  tamanho: number,
  maxLargura: number,
  {gapEm = 0.25, trackingEm = 0, folga = 0.03}: {gapEm?: number; trackingEm?: number; folga?: number} = {},
) => {
  const maiorEm = Math.max(
    0.01,
    ...linhas.map((l) => l.reduce((acc, i, k) => acc + larguraEm(textos[i], fonte, trackingEm) + (k ? gapEm : 0), 0)),
  );
  return Math.min(tamanho, (maxLargura * (1 - folga)) / maiorEm);
};
