// Lógica PURA do ducking da trilha (sem React/Remotion). Assim também dá para medir em Node.
// Dono: agente SOM.
import type {Caption} from '@remotion/captions';

export type Segmento = {ini: number; fim: number};

/** Níveis da trilha a partir de um frame absoluto (por seção). `trilha` = livre; `trilhaSobVoz` = sob a fala. */
export type NivelSecao = {aPartirDoFrame: number; trilha: number; trilhaSobVoz: number};

/** Trilha com mapa de níveis por seção (compensa a dinâmica da própria trilha). */
export type TrilhaComNiveis = {arquivo: string; niveis: NivelSecao[]};

export type ParamsDucking = {
  rampaMs: number;
  preMs: number;
  posMs: number;
  juntarMs: number;
  /** crossfade entre níveis de seções vizinhas */
  transicaoSecaoFrames: number;
};

/** Junta palavras próximas em blocos de fala (evita o "bombeamento" entre sílabas). */
export const blocosDeFala = (palavras: Caption[], juntarMs: number): Segmento[] => {
  const ord = [...palavras].sort((a, b) => a.startMs - b.startMs);
  const out: Segmento[] = [];
  for (const p of ord) {
    const ult = out[out.length - 1];
    if (ult && p.startMs - ult.fim < juntarMs) ult.fim = Math.max(ult.fim, p.endMs);
    else out.push({ini: p.startMs, fim: p.endMs});
  }
  return out;
};

const suave = (x: number) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * (3 - 2 * u);
};

/** Quanto a trilha deve estar abaixada (0 = livre, 1 = sob a voz) em `ms`. Rampas em curva S. */
export const profundidadeDucking = (ms: number, blocos: Segmento[], m: Pick<ParamsDucking, 'rampaMs' | 'preMs' | 'posMs'>) => {
  let d = 0;
  for (const b of blocos) {
    const a1 = b.ini - m.preMs; // já totalmente abaixada aqui
    const a0 = a1 - m.rampaMs;
    const r0 = b.fim + m.posMs; // começa a subir aqui
    const r1 = r0 + m.rampaMs;
    if (ms < a0 || ms > r1) continue;
    const v = ms < a1 ? suave((ms - a0) / m.rampaMs) : ms <= r0 ? 1 : 1 - suave((ms - r0) / m.rampaMs);
    if (v > d) d = v;
    if (d >= 1) break;
  }
  return d;
};

/** Níveis (livre/sob voz) no frame, com crossfade suave centrado em cada fronteira de seção. */
export const niveisNoFrame = (f: number, niveis: NivelSecao[], transicao: number, padrao: {trilha: number; trilhaSobVoz: number}) => {
  if (!niveis.length) return padrao;
  const ord = [...niveis].sort((a, b) => a.aPartirDoFrame - b.aPartirDoFrame);
  let atual = {trilha: ord[0].trilha, trilhaSobVoz: ord[0].trilhaSobVoz};
  for (let i = 1; i < ord.length; i++) {
    const s = ord[i];
    const u = suave((f - (s.aPartirDoFrame - transicao / 2)) / Math.max(1, transicao));
    if (u <= 0) break;
    atual = {
      trilha: atual.trilha + (s.trilha - atual.trilha) * u,
      trilhaSobVoz: atual.trilhaSobVoz + (s.trilhaSobVoz - atual.trilhaSobVoz) * u,
    };
  }
  return atual;
};

/**
 * Ganho da trilha (sem os fades de borda) no frame `f`.
 * `comDucking=false` → só o nível livre da seção (preview sem narração não "bombeia").
 */
export const ganhoTrilha = (
  f: number,
  fps: number,
  blocos: Segmento[],
  niveis: NivelSecao[],
  m: ParamsDucking & {trilha: number; trilhaSobVoz: number},
  comDucking: boolean,
) => {
  const n = niveisNoFrame(f, niveis, m.transicaoSecaoFrames, m);
  if (!comDucking) return n.trilha;
  const d = profundidadeDucking((f / fps) * 1000, blocos, m);
  return n.trilha + (n.trilhaSobVoz - n.trilha) * d;
};
