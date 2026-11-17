// Saída do agente TEXTO para "confie-em-cristo": blocos tipográficos com frames de entrada DERIVADOS de vozConfie.
// Frames aqui são ABSOLUTOS (início do vídeo). Dentro de uma <Sequence from={inicioCena}>, use `relativo(bloco, inicioCena)`.
// Se a voz for re-transcrita, tudo se recalcula; se uma âncora sumir, o build falha com mensagem clara.
import {msParaFrame} from '../../config/formatos';
import {efeitosTransicaoConfie} from './cenas';
import {vozConfie} from './voz';

const FPS = 60;
const P = vozConfie.palavras;
const limpa = (t: string) => t.trim().toLowerCase().replace(/[.,:;!?]/g, '');

/** Índice da n-ésima ocorrência (1-based) de `palavra` na narração. */
const idx = (palavra: string, ocorrencia = 1) => {
  let n = 0;
  for (let i = 0; i < P.length; i++) if (limpa(P[i].text) === limpa(palavra) && ++n === ocorrencia) return i;
  throw new Error(`texto.ts: palavra "${palavra}" (#${ocorrencia}) não encontrada em vozConfie`);
};
/** Índices de uma sequência contígua de palavras da narração (a partir da 1ª ocorrência de seq[0] após `apos`). */
const seq = (palavras: string[], apos = -1): number[] => {
  for (let i = apos + 1; i <= P.length - palavras.length; i++) {
    if (palavras.every((w, k) => limpa(P[i + k].text) === limpa(w))) return palavras.map((_, k) => i + k);
  }
  throw new Error(`texto.ts: sequência "${palavras.join(' ')}" não encontrada em vozConfie`);
};
const ini = (i: number) => msParaFrame(P[i].startMs, FPS);
const fim = (i: number) => msParaFrame(P[i].endMs, FPS);

export type BlocoTexto = {
  palavras: string[];
  /** Frames absolutos de entrada (1 por palavra). */
  entradas: number[];
  quebras?: number[];
  destaques?: number[];
  /** Frame absoluto para iniciar a saída. */
  saidaEm?: number;
  /** Duração da saída (frames) considerada no cálculo de `saidaEm` — passe-a ao componente. */
  duracaoSaida?: number;
  /** Duração da entrada por palavra (frames), quando diferente do padrão do componente. */
  duracaoEntrada?: number;
};

/** Margem mínima de tela limpa entre o fim de uma saída e o próximo evento (transição ou outro texto). */
const LIMPO = 6;
/**
 * `saidaEm` para que a saída TERMINE `margem` frames antes de `limite`.
 * `escalonado` = TextoImpacto (2 f por palavra); TextoEditorial sai em bloco (escalonado = false).
 */
const saidaAntes = (limite: number, duracao: number, nPalavras: number, escalonado: boolean, margem = LIMPO) =>
  limite - margem - duracao - (escalonado ? 2 * (nPalavras - 1) : 0);
/** Início das janelas de transição (derivadas da voz em cenas.ts). Nenhum texto pode estar visível dentro delas. */
const T = (de: string) => {
  const t = efeitosTransicaoConfie.find((x) => x.de === de);
  if (!t) throw new Error(`texto.ts: transição a partir de "${de}" não encontrada em cenas.ts`);
  return t.inicio;
};

/** Converte um bloco absoluto em relativo ao início da cena (para usar dentro de <Sequence from={inicioCena}>). */
export const relativo = <T extends {entradas?: number[]; batidas?: number[]; saidaEm?: number}>(b: T, inicioCena: number): T => ({
  ...b,
  ...(b.entradas ? {entradas: b.entradas.map((f) => f - inicioCena)} : {}),
  ...(b.batidas ? {batidas: b.batidas.map((f) => f - inicioCena)} : {}),
  ...(b.saidaEm !== undefined ? {saidaEm: b.saidaEm - inicioCena} : {}),
});

// ---- Cena 1 — tela não é transcrição: "VOCÊ NÃO PRECISA" ancorado em "entenda", "TER TODAS AS RESPOSTAS." após "agora".
const iEntenda = idx('entenda');
const iAgora = idx('agora');
const fAgora = fim(iAgora);
const s1 = seq(['Talvez', 'os', 'seus', 'planos']);
export const textoCena1: BlocoTexto = {
  palavras: ['Você', 'não', 'precisa', 'ter', 'todas', 'as', 'respostas.'],
  // "VOCÊ NÃO PRECISA" acompanha "entenda o que" (palavras consecutivas da voz);
  // "TER TODAS AS RESPOSTAS." entra no silêncio após "agora", em cadência de 6 f até "Talvez" (2ª frase).
  entradas: [ini(iEntenda), ini(iEntenda + 1), ini(iEntenda + 2), fAgora, fAgora + 6, fAgora + 12, fAgora + 18],
  quebras: [2, 5], // VOCÊ NÃO PRECISA / TER TODAS AS / RESPOSTAS.
  destaques: [6], // RESPOSTAS (dourado)
  // Rev.1 #1: sai inteiro ANTES do vazamento de luz da T1 (antes cortava "VOCÊ" e ficava fantasma no flash).
  saidaEm: saidaAntes(T('incerteza'), 22, 7, true),
  duracaoSaida: 22,
};
export const ancoraDouradoCena1 = ini(s1[3]); // "planos": momento sugerido para aquecer RESPOSTAS (se COR quiser animar)

// ---- Cena 2 — transcrição literal.
const s2 = seq(['Talvez', 'você', 'esteja', 'cansado', 'de', 'esperar']);
export const textoCena2: BlocoTexto = {
  palavras: ['Talvez', 'você', 'esteja', 'cansado', 'de', 'esperar.'],
  entradas: s2.map(ini),
  quebras: [2, 3], // TALVEZ VOCÊ ESTEJA / CANSADO / DE ESPERAR.
  destaques: [3],
  // Rev.1 #1: sai inteiro ANTES da fenda de luz da T2 (antes a fenda recortava "CANS DO").
  saidaEm: saidaAntes(T('momentos-dificeis'), 24, 6, true),
  duracaoSaida: 24,
};

// ---- Cena 3 — "DEUS NÃO PERDEU O CONTROLE" (impacto) + "da sua história." (editorial).
const s3 = seq(['Deus', 'não', 'perdeu', 'o', 'controle']);
const s3b = seq(['da', 'sua', 'história']);
export const textoCena3Impacto: BlocoTexto = {
  palavras: ['Deus', 'não', 'perdeu', 'o', 'controle'],
  entradas: s3.map(ini),
  quebras: [1, 3], // DEUS NÃO / PERDEU O / CONTROLE
  destaques: [4],
  // Limpo antes de "Confiar" (o bloco textoCena3Confiar entra na mesma região).
  saidaEm: saidaAntes(ini(idx('Confiar')), 30, 5, true),
  duracaoSaida: 30,
};
export const textoCena3Editorial: BlocoTexto = {
  palavras: ['da', 'sua', 'história.'],
  entradas: s3b.map(ini),
  saidaEm: saidaAntes(ini(idx('Confiar')), 30, 3, false),
  duracaoSaida: 30,
};
// Rev.1 #7: "Confiar em Cristo não significa entender todos os caminhos." (antes: 4,5 s sem evento visual).
// Fiel à fala (cada palavra = palavra dita); "Cristo" (1ª menção) em dourado. Sai >= 20 f antes de "Significa".
const s3conf = seq(['Confiar', 'em', 'Cristo', 'não', 'significa', 'entender', 'todos', 'os', 'caminhos']);
export const textoCena3Confiar: BlocoTexto = {
  palavras: ['Confiar', 'em', 'Cristo', 'não', 'significa', 'entender', 'todos', 'os', 'caminhos.'],
  entradas: s3conf.map(ini),
  quebras: [2, 5], // Confiar em Cristo / não significa entender / todos os caminhos.
  destaques: [2],
  duracaoEntrada: 24, // "caminhos" precisa focar antes da saída
  saidaEm: saidaAntes(ini(idx('Significa', 2)), 16, 9, false, 20),
  duracaoSaida: 16,
};
const s3c = seq(['Significa', 'continuar', 'caminhando']);
export const textoCena3Apoio: BlocoTexto = {
  palavras: ['continuar', 'caminhando'],
  entradas: [ini(s3c[1]), ini(s3c[2])],
  destaques: [1],
  saidaEm: Math.min(fim(idx('destino')) - 20, saidaAntes(T('mensagem'), 30, 2, false)),
  duracaoSaida: 30,
};

// ---- Cena 4 — "Quando faltar força," / "Quando faltar direção," (editorial) + CONFIE. gigante nas batidas.
const s4a = seq(['Quando', 'faltar', 'força']);
const s4b = seq(['Quando', 'faltar', 'direção']);
const iConfie1 = idx('confie', 1);
const iConfie2 = idx('confie', 2);
export const textoCena4a: BlocoTexto = {palavras: ['Quando', 'faltar', 'força,'], entradas: s4a.map(ini), destaques: [2], saidaEm: saidaAntes(ini(s4b[0]), 30, 3, false), duracaoSaida: 30};
export const textoCena4b: BlocoTexto = {palavras: ['Quando', 'faltar', 'direção,'], entradas: s4b.map(ini), destaques: [2]};
export const confieCena4 = {texto: 'CONFIE.', batidas: [ini(iConfie1), ini(iConfie2)], escalasBatidas: [1, 1.06], douradoNaBatida: 1};

// ---- Cena 5 — editorial.
const s5a = seq(['Quando', 'tudo', 'parecer', 'impossível']);
const s5b = seq(['Jesus', 'continua', 'ao', 'seu', 'lado']);
const s5c = seq(['Não', 'tenha', 'medo', 'do', 'amanhã']);
// Rev.1 #1 (BLOQUEANTE): limpo >= 6 f antes de "Jesus" (antes ainda estava em fade sob o JESUS em f2016–2029).
export const textoCena5a: BlocoTexto = {palavras: ['Quando', 'tudo', 'parecer', 'impossível,'], entradas: s5a.map(ini), saidaEm: saidaAntes(ini(s5b[0]), 30, 4, false), duracaoSaida: 30};
export const textoCena5Jesus: BlocoTexto = {palavras: ['Jesus'], entradas: [ini(s5b[0])], destaques: [0], saidaEm: saidaAntes(ini(s5c[0]), 24, 1, true), duracaoSaida: 24};
export const textoCena5b: BlocoTexto = {palavras: ['continua', 'ao', 'seu', 'lado.'], entradas: s5b.slice(1).map(ini), saidaEm: saidaAntes(ini(s5c[0]), 30, 4, false), duracaoSaida: 30};
export const textoCena5c: BlocoTexto = {palavras: ['Não', 'tenha', 'medo', 'do', 'amanhã.'], entradas: s5c.map(ini), quebras: [2], destaques: [4]};

// ---- Cena 6 — assinatura.
const s6a = seq(['Confie', 'em', 'Cristo']);
const s6b = seq(['Ele', 'é', 'o', 'caminho', 'a', 'verdade', 'e', 'a', 'vida']);
export const textoCena6Titulo: BlocoTexto = {palavras: ['Confie', 'em', 'Cristo.'], entradas: s6a.map(ini), quebras: [0], destaques: [2]};
export const textoCena6Versiculo: BlocoTexto = {
  palavras: ['Ele', 'é', 'o', 'caminho,', 'a', 'verdade', 'e', 'a', 'vida.'],
  entradas: s6b.map(ini),
  quebras: [3], // Ele é o caminho, / a verdade e a vida.
  destaques: [3],
};
/** Referência: sem palavra falada; entra 400 ms após o FIM de "vida" (derivado da voz, não chutado). */
export const textoCena6Referencia: BlocoTexto = {palavras: ['João', '14,6'], entradas: [fim(s6b[8]) + msParaFrame(400, FPS), fim(s6b[8]) + msParaFrame(400, FPS) + 4]};
