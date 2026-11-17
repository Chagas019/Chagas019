// Contrato de saída do agente VOZ. Formato de palavra = Caption do @remotion/captions.
import type {Caption} from '@remotion/captions';

export type Pausa = {inicioMs: number; fimMs: number};
export type Impacto = {ms: number; palavra: string; tipo: 'enfase' | 'pausa' | 'climax'};

export type AnaliseVoz = {
  /** Caminho relativo a public/ (ex.: "audio/narracao/demo.wav") ou null se ainda não houver áudio. */
  arquivo: string | null;
  duracaoMs: number;
  palavras: Caption[];
  pausas: Pausa[];
  impactos: Impacto[];
};
