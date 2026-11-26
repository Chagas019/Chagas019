/**
 * PafiesFilme — o filme completo (horizontal ou vertical).
 * Cenas em <Sequence> sobrepostas conforme SCENES (timeline.json): a que entra fica POR CIMA.
 * Transições motivadas (nunca crossfade):
 *   S01→S02 íris a partir da gota laranja · S02→S03 mergulho no reflexo + íris do branco (dentro das cenas)
 *   S03→S04 whip-pan (whipPan, dentro das cenas; a fita sobrevive) · S04→S05 colapso em faísca (S04)
 *   S05→S06 mergulho no "0": zoomDive — a S06 aparece pelo miolo do "0".
 */
import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { COLORS } from '../design/tokens';
import { EXPO_IN, TransitionWrap, prog, zoomDive } from '../motion';
import { SCENES, type SceneId } from '../timeline';
import { S01, S05 } from '../cues';
import { useLayout, type LayoutMode } from '../layout';
import { SCENE_COMPONENTS } from '../scenes';
import { DIVE_MAX_SCALE, ZERO_HOLE, dezSize, zeroAnchor } from '../scenes/S05Dez';
import { FilmOverlay } from './FilmOverlay';

export type PafiesFilmeProps = { layout?: LayoutMode };

/** Íris circular nascendo da gota laranja do S01 (handoff 225–239). */
const IrisFromDrop: React.FC<{ frame: number; from: number; to: number; children: React.ReactNode }> = ({ frame, from, to, children }) => {
  const { W, H, cx, cy } = useLayout();
  const p = prog(frame, from, to, EXPO_IN);
  const r = 20 + p * Math.hypot(W, H) * 0.6;
  const clip = p >= 1 ? undefined : `circle(${r}px at ${cx}px ${cy}px)`;
  return <AbsoluteFill style={{ clipPath: clip, WebkitClipPath: clip }}>{children}</AbsoluteFill>;
};

export const PafiesFilme: React.FC<PafiesFilmeProps> = ({ layout }) => {
  const frame = useCurrentFrame();
  const L = useLayout(layout);
  const mode: LayoutMode = L.isV ? 'v' : 'h';
  const anchor = zeroAnchor(L.isV, L.W, L.H);
  const dive = zoomDive({ x: anchor.x, y: anchor.y, maxScale: DIVE_MAX_SCALE, holeRadius: dezSize(L.isV) * ZERO_HOLE, enterScale: 1.25 });
  const diveP = prog(frame, S05.dive, S05.diveEnd);

  const wrap = (id: SceneId, node: React.ReactNode, from: number, to: number) => {
    if (id === 'S02') return <IrisFromDrop frame={frame} from={from} to={S01.spiralDone + 11}>{node}</IrisFromDrop>;
    if (id === 'S06')
      return (
        <TransitionWrap presentation={dive} progress={diveP} role="entering" durationInFrames={S05.diveEnd - S05.dive}>
          {node}
        </TransitionWrap>
      );
    void to;
    return node;
  };

  return (
    <AbsoluteFill style={{ background: COLORS.navyNight }}>
      {SCENES.map((s) => {
        const Comp = SCENE_COMPONENTS[s.id];
        return (
          <Sequence key={s.id} from={s.from} durationInFrames={s.durationInFrames} name={`${s.id} · ${s.name}`}>
            {wrap(s.id, <Comp layout={mode} />, s.from, s.to)}
          </Sequence>
        );
      })}
      <FilmOverlay frame={frame} />
      <Audio src={staticFile('trilha.wav')} />
    </AbsoluteFill>
  );
};
