// Legendas v2 (linguagem da referência): bloco curto no alto da tela, karaokê palavra a palavra —
// palavras já ditas em cinza claro, a palavra atual em branco bold, palavras-chave com "caixa de seleção" dourada.
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {F} from '../brand/tokens';

type Word = {w: string; start: number; end: number; hl: boolean};
type Cue = {text: string; start: number; end: number; words: Word[]; subtitle: boolean};

function chunk(words: Word[], maxChars = 26) {
  const out: Word[][] = [];
  let cur: Word[] = [], len = 0;
  for (const w of words) {
    if (cur.length && len + w.w.length + 1 > maxChars) { out.push(cur); cur = []; len = 0; }
    cur.push(w); len += w.w.length + 1;
  }
  if (cur.length) out.push(cur);
  if (out.length > 1 && out[out.length - 1].length === 1 && out[out.length - 2].length > 2) out[out.length - 1].unshift(out[out.length - 2].pop()!);
  return out;
}

const GOLD = '#E9B44C';

export const Subtitles: React.FC<{cues: Cue[]; y?: number}> = ({cues, y = 330}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cue = cues.find((c) => c.subtitle && t >= c.start - 0.05 && t <= c.end + 0.3);
  if (!cue) return null;
  const groups = chunk(cue.words);
  let gi = groups.findIndex((g) => t < g[g.length - 1].end + 0.1);
  if (gi < 0) gi = groups.length - 1;
  const g = groups[gi];
  const out = interpolate(t, [cue.end + 0.12, cue.end + 0.3], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: y, left: 0, right: 0, textAlign: 'center', opacity: out}}>
      <div style={{display: 'inline-block', maxWidth: 940, padding: '10px 18px 4px', borderRadius: 18, background: 'rgba(22,15,10,0.5)'}}>
        {g.map((w, i) => {
          const seen = t >= w.start - 0.04;
          const active = seen && (i === g.length - 1 ? true : t < g[i + 1].start - 0.04);
          const pop = interpolate(t, [w.start - 0.04, w.start + 0.1], [0.85, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          const box = w.hl && seen;
          return (
            <span key={i} style={{
              position: 'relative', display: 'inline-block', margin: '0 7px 8px', padding: box ? '0 8px' : 0,
              fontFamily: F.legenda, fontWeight: active || box ? 800 : 600, fontSize: 54, lineHeight: 1.2,
              color: !seen ? 'rgba(255,255,255,0)' : active || box ? '#FFFFFF' : 'rgba(235,228,214,0.72)',
              textShadow: seen ? '0 2px 0 rgba(0,0,0,0.55), 0 0 14px rgba(0,0,0,0.65)' : 'none',
              transform: `scale(${seen ? pop : 0.85})`,
            }}>
              {box && (
                <span style={{position: 'absolute', inset: '2px -2px 0', border: `3px solid ${GOLD}`, borderRadius: 4, background: 'rgba(233,180,76,0.16)'}}>
                  <span style={{position: 'absolute', left: -9, top: -9, width: 14, height: 14, borderRadius: 7, background: GOLD, border: '2px solid #fff'}} />
                  <span style={{position: 'absolute', right: -9, bottom: -9, width: 14, height: 14, borderRadius: 7, background: GOLD, border: '2px solid #fff'}} />
                </span>
              )}
              <span style={{position: 'relative'}}>{w.w}</span>
            </span>
          );
        })}
      </div>
      </div>
    </AbsoluteFill>
  );
};
