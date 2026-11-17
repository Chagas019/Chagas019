// Legendas dinâmicas sincronizadas palavra a palavra (dados de audio/timings.json).
// Palavras entram com leve subida + desfoque; palavras-chave em ouro.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from '../brand/tokens';

type Word = {w: string; start: number; end: number; hl: boolean};
type Cue = {text: string; start: number; end: number; words: Word[]; subtitle: boolean};

function chunk(words: Word[], maxChars = 24) {
  const out: Word[][] = [];
  let cur: Word[] = [], len = 0;
  for (const w of words) {
    if (cur.length && len + w.w.length + 1 > maxChars) { out.push(cur); cur = []; len = 0; }
    cur.push(w); len += w.w.length + 1;
  }
  if (cur.length) out.push(cur);
  // evita órfã de 1 palavra no fim
  if (out.length > 1 && out[out.length - 1].length === 1 && out[out.length - 2].length > 2) out[out.length - 1].unshift(out[out.length - 2].pop()!);
  return out;
}

export const Subtitles: React.FC<{cues: Cue[]; y?: number}> = ({cues, y = 1360}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cue = cues.find((c) => c.subtitle && t >= c.start - 0.05 && t <= c.end + 0.35);
  if (!cue) return null;
  const groups = chunk(cue.words);
  let gi = groups.findIndex((g) => t < g[g.length - 1].end + 0.12);
  if (gi < 0) gi = groups.length - 1;
  const g = groups[gi];
  const gStart = g[0].start;
  const out = interpolate(t, [cue.end + 0.15, cue.end + 0.35], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: y, left: 70, right: 70, textAlign: 'center', opacity: out}}>
        <div style={{display: 'inline-block', padding: '10px 26px', borderRadius: 14,
          background: 'radial-gradient(ellipse at center, rgba(10,7,4,0.55), rgba(10,7,4,0) 72%)'}}>
          {g.map((w, i) => {
            const p = interpolate(t, [w.start - 0.08, w.start + 0.14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const appear = t < gStart ? 0 : p;
            return (
              <span key={i} style={{
                display: 'inline-block', marginRight: 14, fontFamily: F.legenda, fontWeight: 800,
                fontSize: w.hl ? 66 : 60, letterSpacing: -0.5, lineHeight: 1.15,
                color: w.hl ? C.ouroClaro : C.pergaminho,
                textShadow: w.hl
                  ? `0 0 22px rgba(212,162,76,0.55), 0 3px 10px rgba(0,0,0,0.9)`
                  : '0 3px 10px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)',
                opacity: appear, transform: `translateY(${(1 - appear) * 18}px) scale(${0.94 + appear * 0.06})`,
                filter: `blur(${(1 - appear) * 6}px)`,
              }}>{w.w}</span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
