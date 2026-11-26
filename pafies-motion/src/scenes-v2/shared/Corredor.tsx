/**
 * Corredor — o personagem DO CLIENTE, fiel (jovem de moletom roxo/preto, tênis enormes com sola
 * listrada, brilhos de fogo). NÃO é redesenhado: usa os 5 recortes do GIF dele
 * (public/corredor/f00…f04.png, 1600×1200 RGBA, gerados por scripts/recortar_personagem.py),
 * que formam o ciclo de corrida em câmera baixa (olhando para a direita).
 *
 * Pose: i = floor((frame + frameOffset) / framesPerPose) % 5  (3 f/pose ≈ 10 poses/s, como o GIF).
 * Âncora: (x, y) = centro da BASE do quadro de 1600×1200 (linha do chão/sola).
 */
import React from 'react';
import { Img, staticFile, useCurrentFrame } from 'remotion';

export const CORREDOR_FRAMES = 5;
export const CORREDOR_W = 1600;
export const CORREDOR_H = 1200;
/** Fração da altura do quadro ocupada pelo boneco (topo da cabeça ≈ 17% do quadro). */
export const CORREDOR_BODY = 0.82;

export const corredorSrc = (i: number) => staticFile(`corredor/f0${((i % CORREDOR_FRAMES) + CORREDOR_FRAMES) % CORREDOR_FRAMES}.png`);

export type CorredorProps = {
  /** x do centro da base (px). */
  x: number;
  /** y da base / chão (px). */
  y: number;
  /** Altura do QUADRO em px (o boneco ocupa ~82% dela). */
  height: number;
  /** Espelha (correndo para a esquerda). */
  flip?: boolean;
  rotate?: number;
  scale?: number;
  opacity?: number;
  /** Desloca a fase do ciclo (frames). */
  frameOffset?: number;
  /** Frames por pose (2–3). Padrão 3. */
  framesPerPose?: number;
  /** Frame a usar (padrão: useCurrentFrame()). Passe um frame congelado para "segurar" a pose. */
  frame?: number;
  /** Pose fixa (ignora o ciclo). */
  pose?: number;
  style?: React.CSSProperties;
};

export const Corredor: React.FC<CorredorProps> = ({
  x,
  y,
  height,
  flip = false,
  rotate = 0,
  scale = 1,
  opacity = 1,
  frameOffset = 0,
  framesPerPose = 3,
  frame,
  pose,
  style,
}) => {
  const cur = useCurrentFrame();
  const f = frame ?? cur;
  const i = pose ?? Math.floor((f + frameOffset) / framesPerPose);
  const w = (height * CORREDOR_W) / CORREDOR_H;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - height,
        width: w,
        height,
        opacity,
        transformOrigin: '50% 100%',
        transform: `rotate(${rotate}deg) scale(${(flip ? -1 : 1) * scale}, ${scale})`,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* pré-carrega todas as poses (evita piscar na troca) */}
      {Array.from({ length: CORREDOR_FRAMES }, (_, k) => (
        <Img
          key={k}
          src={corredorSrc(k)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            visibility: ((i % CORREDOR_FRAMES) + CORREDOR_FRAMES) % CORREDOR_FRAMES === k ? 'visible' : 'hidden',
          }}
        />
      ))}
    </div>
  );
};
