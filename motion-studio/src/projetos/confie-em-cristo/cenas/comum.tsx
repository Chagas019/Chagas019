// Utilitários compartilhados pelas cenas do "confie-em-cristo". Dono: agente CÓDIGO.
// Só layout/tempo: nenhuma lógica visual de outros agentes é duplicada aqui.
import React from 'react';
import {AbsoluteFill, interpolate, useVideoConfig} from 'remotion';
import {areaSegura, unidade} from '../../../config/formatos';
import {iniciosDasCenas} from '../../../cenas/tipos';
import {gatilhosConfie, planoConfie} from '../cenas';

/** Início absoluto de cada cena, na ordem do plano (frames). */
export const iniciosConfie = iniciosDasCenas(planoConfie);

/** Índice de uma cena pelo id (falha cedo se o plano mudar de id). */
export const indiceCena = (id: string) => {
  const i = planoConfie.cenas.findIndex((c) => c.id === id);
  if (i < 0) throw new Error(`ConfieEmCristo: cena "${id}" não existe em planoConfie`);
  return i;
};

/** Início absoluto e duração de uma cena. */
export const janelaCena = (id: string) => {
  const i = indiceCena(id);
  return {inicio: iniciosConfie[i], frames: planoConfie.cenas[i].frames};
};

/** Converte frame absoluto (gatilhosConfie) em frame local da Sequence. */
export const local = (absoluto: number, inicioCena: number) => absoluto - inicioCena;

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** Medidas responsivas usadas por todas as cenas. */
export const useLayout = () => {
  const {width, height} = useVideoConfig();
  const u = unidade(width, height);
  const seg = areaSegura(width, height);
  return {width, height, u, seg, maxLargura: width - 2 * seg.x, vertical: height > width};
};

/**
 * Ancora um bloco centralizado na horizontal com o CENTRO vertical em `y` (fração da altura).
 * O topo/base são limitados à área segura (o bloco nunca entra nos 20% inferiores do vertical).
 */
export const Ancora: React.FC<{y: number; children: React.ReactNode; style?: React.CSSProperties}> = ({y, children, style}) => {
  const {height, seg} = useLayout();
  const topo = Math.max(seg.topo, Math.min(height - seg.base, y * height));
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: topo, display: 'flex', justifyContent: 'center', transform: 'translateY(-50%)', ...style}}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Sangria: amplia levemente o cenário para que pan/câmera na mão nunca revelem a borda. */
export const Sangria: React.FC<{escala?: number; children: React.ReactNode}> = ({escala = 1.06, children}) => (
  <AbsoluteFill style={{transform: `scale(${escala})`, transformOrigin: '50% 50%'}}>{children}</AbsoluteFill>
);

// ─────────────── Caminhada (cenas 2 e 3 compartilham a mesma linha do tempo) ───────────────
// A velocidade replica a do Caminhante (parada linear em 45 f, retomada linear em 40 f), para que a
// estrada e a posição na perspectiva parem junto com as pernas. Função de frame ABSOLUTO → contínua na T2.
const g = gatilhosConfie;
const INICIO_CAMINHADA = janelaCena('momentos-dificeis').inicio;
export const CAMINHADA = {
  paraEm: g.escute,
  duracaoParada: 45,
  retomaEm: g.caminhando,
  duracaoRetomada: 40,
  /** unidades de mundo da Estrada por frame (caminhada contemplativa 0,04–0,06) */
  avancoPorFrame: 0.045,
  /** progresso em naEstrada por frame */
  progressoPorFrame: 0.0008,
  progressoInicial: 0.05,
  inicio: INICIO_CAMINHADA,
} as const;

const velocidade = (abs: number) => {
  let v = 1;
  if (abs > CAMINHADA.paraEm) v = Math.max(0, 1 - (abs - CAMINHADA.paraEm) / CAMINHADA.duracaoParada);
  if (abs > CAMINHADA.retomaEm) v = Math.max(v, Math.min(1, (abs - CAMINHADA.retomaEm) / CAMINHADA.duracaoRetomada));
  return v;
};

/** Distância percorrida (frames equivalentes em velocidade plena) desde o início da cena 2. Integração fechada por trechos. */
const percorrido = (abs: number) => {
  const t = Math.max(0, abs - CAMINHADA.inicio);
  const fim = CAMINHADA.inicio + t;
  // soma discreta barata (≤ ~1100 iterações), determinística
  let acc = 0;
  for (let f = CAMINHADA.inicio; f < fim; f++) acc += velocidade(f + 0.5);
  return acc;
};

/** Estado da caminhada no frame absoluto: avanço da estrada e progresso na perspectiva. */
export const caminhada = (abs: number) => {
  const d = percorrido(abs);
  return {avanco: d * CAMINHADA.avancoPorFrame, progresso: CAMINHADA.progressoInicial + d * CAMINHADA.progressoPorFrame};
};

/** Rampa suave clampada (atalho de interpolate). */
export const rampa = (frame: number, de: number, ate: number, v0: number, v1: number, easing?: (t: number) => number) =>
  interpolate(frame, [de, ate], [v0, v1], {...clamp, easing});

/** Sino de flash: sobe em `ataque` frames e decai em `decai` frames a partir de cada batida. */
export const flash = (frame: number, batidas: number[], ataque = 3, decai = 20) =>
  Math.min(
    1,
    batidas.reduce((acc, b) => {
      const t = frame - b;
      if (t < 0) return acc;
      return acc + (t < ataque ? t / ataque : Math.max(0, 1 - (t - ataque) / decai) ** 2);
    }, 0),
  );
