// Utilitários de sincronização de voz. Dono: agente VOZ.
import type {Caption} from '@remotion/captions';
import type {Pausa} from './tipos';

/** Monta Captions a partir de [texto, inicioMs, fimMs]. Espaço inicial segue a convenção do @remotion/captions. */
export const palavras = (lista: [string, number, number][]): Caption[] =>
  lista.map(([text, startMs, endMs], i) => ({
    text: i === 0 ? text : ` ${text}`,
    startMs,
    endMs,
    timestampMs: (startMs + endMs) / 2,
    confidence: 1,
  }));

/** Detecta silêncios entre palavras maiores que `minMs`. */
export const detectarPausas = (caps: Caption[], minMs = 250): Pausa[] => {
  const out: Pausa[] = [];
  for (let i = 1; i < caps.length; i++) {
    const gap = caps[i].startMs - caps[i - 1].endMs;
    if (gap >= minMs) out.push({inicioMs: caps[i - 1].endMs, fimMs: caps[i].startMs});
  }
  return out;
};

/** Índice da palavra ativa no instante `ms` (-1 se nenhuma). */
export const palavraAtiva = (caps: Caption[], ms: number) =>
  caps.findIndex((c) => ms >= c.startMs && ms < c.endMs);
