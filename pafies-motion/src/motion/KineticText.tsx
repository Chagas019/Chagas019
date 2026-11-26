/**
 * <KineticText /> — tipografia cinética reutilizável, letra a letra.
 *
 * Frame: usa useCurrentFrame() → `startFrame`/`exitFrame` são RELATIVOS à <Sequence> que contém o texto.
 *
 * Modos de entrada (`mode`):
 *  - 'rise'          letras sobem de dentro de uma máscara (overflow) com overshoot POP. startFrame = início.
 *  - 'stagger-scale' letras crescem 0→1 com POP, em stagger. startFrame = início.
 *  - 'slam'          letras entram GRANDES e batem no lugar com squash & stretch.
 *                    ATENÇÃO: aqui startFrame = frame do POUSO (pico ★) da 1ª letra; a aproximação
 *                    acontece nos `slamFrames` anteriores (default 6). Ideal para sincronizar com cue.
 *  - 'wipe'          revelação por máscara diagonal (opcionalmente com faixa `wipeBand` na borda).
 *  - 'scatter-out'   texto já presente; em startFrame explode (cada letra voa p/ fora, gira, some).
 *  - 'pop-word'      (V2) a PALAVRA INTEIRA bate como um bloco: estica na aproximação (`popFrames`, default 4),
 *                    startFrame = frame do POUSO (squash elástico GELATINA) e depois TREME em cada beat
 *                    (`beats` = frames relativos, ou `beatEvery` a partir do pouso): pulso de escala +
 *                    tremor on twos por letra (`tremor` px). Ideal para "E AÍ," / "HEIN?".
 *  - 'type-beat'     (V2) letras entram UMA POR BEAT com salto (hop + squash no pouso). Tempo de cada letra:
 *                    `beats` (frames relativos, um por letra NÃO-espaço) ou startFrame + i·`step`
 *                    (default 7.5 = meio beat a 120 BPM/30 fps). Espaços não consomem beat.
 *
 * Saída (`exitFrame` + `exit`): 'scatter' | 'up' | 'down' | 'suck' | 'whip-up' | 'none'.
 * Saídas são mais rápidas que entradas (default 7 f, EXPO_IN).
 *
 * Micro-vida (`life`, default true): drift de escala 1.00→1.03 + flutuação y ±3px enquanto visível
 * (regra "nenhuma palavra parada").
 *
 * Texto dividido por GRAFEMA (Array.from + marcas combinantes unidas) → "Á", "Ç", "Ã", "ª" seguros.
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, random } from 'remotion';
import { EXPO_IN, EXPO_OUT, FLUID, WHIP } from './easings';
import { GELATINA, POP, type SpringCfg, springAt, squashAt } from './springs';
import { prog, mix, wiggle } from './hooks';

export type KineticMode = 'rise' | 'stagger-scale' | 'slam' | 'wipe' | 'scatter-out' | 'pop-word' | 'type-beat';
export type KineticExit = 'scatter' | 'up' | 'down' | 'suck' | 'whip-up' | 'none';
export type StaggerFrom = 'start' | 'end' | 'center' | 'edges' | 'random';

export type KineticTextProps = {
  text: string;
  startFrame?: number;
  mode?: KineticMode;
  /** frames entre letras (default 2). */
  stagger?: number;
  staggerFrom?: StaggerFrom;
  /** duração da entrada por letra em frames (rise/stagger-scale usam spring; wipe usa isto inteiro). default 12. */
  duration?: number;
  /** 'slam': frames de aproximação antes do pouso (default 6). */
  slamFrames?: number;
  /** 'slam': escala inicial (default 2.4). */
  slamScale?: number;
  spring?: SpringCfg;
  /** 'pop-word' / 'type-beat': frames (RELATIVOS à Sequence) dos beats. pop-word: tremores; type-beat: 1 por letra. */
  beats?: number[];
  /** 'pop-word': se `beats` não for dado, treme a cada N frames após o pouso (default 15 = 1 beat; 0 desliga). */
  beatEvery?: number;
  /** 'pop-word': frames de aproximação esticada antes do pouso (default 4). */
  popFrames?: number;
  /** 'pop-word': amplitude do tremor por letra em px (default fontSize·0.02). */
  tremor?: number;
  /** 'pop-word': pulso de escala em cada beat (default 0.08). */
  beatScale?: number;
  /** 'type-beat': frames entre letras quando `beats` não é dado (default 7.5). */
  step?: number;
  /** 'type-beat': altura do salto em fração do fontSize (default 0.35). */
  hop?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | string;
  color?: string;
  /** CSS gradient (ex.: 'linear-gradient(180deg,#FFE08A 0%,#E9B949 45%,#A8741A 100%)'). Sobrepõe `color`. */
  gradient?: string;
  letterSpacing?: string | number;
  lineHeight?: number;
  /** sombra sólida (default '0 6px 0 #060F2E'); false para nenhuma. Com gradient vira filter: drop-shadow. */
  shadow?: string | false;
  strokeColor?: string;
  strokeWidth?: number;
  /** 'wipe': cor de uma faixa que acompanha a borda da máscara (ex.: '#FF7A00'). */
  wipeBand?: string;
  /** 'wipe': inclinação da borda, em % da largura (default 28). */
  wipeSlant?: number;
  exitFrame?: number;
  exit?: KineticExit;
  exitDuration?: number;
  exitStagger?: number;
  life?: boolean;
  seed?: string;
  style?: React.CSSProperties;
  letterStyle?: React.CSSProperties;
};

/** Divide em grafemas: Array.from + junta marcas combinantes (\p{M}) ao caractere anterior. */
export const splitGraphemes = (text: string): string[] => {
  const out: string[] = [];
  for (const ch of Array.from(text)) {
    if (out.length && /\p{M}/u.test(ch)) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
};

const orderIndex = (i: number, n: number, from: StaggerFrom, seed: string): number => {
  const c = (n - 1) / 2;
  switch (from) {
    case 'end':
      return n - 1 - i;
    case 'center':
      return Math.round(Math.abs(i - c));
    case 'edges':
      return Math.round(c - Math.abs(i - c));
    case 'random':
      return Math.floor(random(`${seed}-ord-${i}`) * n);
    default:
      return i;
  }
};

export const KineticText: React.FC<KineticTextProps> = ({
  text,
  startFrame = 0,
  mode = 'rise',
  stagger = 2,
  staggerFrom = 'start',
  duration = 12,
  slamFrames = 6,
  slamScale = 2.4,
  spring: springCfg = POP,
  beats,
  beatEvery = 15,
  popFrames = 4,
  tremor,
  beatScale = 0.08,
  step = 7.5,
  hop = 0.35,
  fontFamily,
  fontSize = 200,
  fontWeight = 900,
  color = '#FFF6E5',
  gradient,
  letterSpacing = '-0.02em',
  lineHeight = 1,
  shadow = '0 6px 0 #060F2E',
  strokeColor,
  strokeWidth = 0,
  wipeBand,
  wipeSlant = 28,
  exitFrame,
  exit = 'up',
  exitDuration = 7,
  exitStagger = 1,
  life = true,
  seed = 'kt',
  style,
  letterStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = splitGraphemes(text);
  const n = chars.length;
  const c = (n - 1) / 2;
  const isScatterMode = mode === 'scatter-out';
  const exitAt = isScatterMode ? startFrame : exitFrame;
  const exitKind: KineticExit = isScatterMode ? 'scatter' : exit;
  const exitDur = isScatterMode ? Math.max(exitDuration, 12) : exitDuration;

  // fim total → não renderiza nada
  if (exitAt !== undefined && exitKind !== 'none') {
    const endAll = exitAt + exitDur + exitStagger * n + 1;
    if (frame > endAll) return null;
  }
  // antes de começar (exceto scatter-out, que já está presente)
  const preRoll = mode === 'slam' ? slamFrames : mode === 'pop-word' ? popFrames : 0;
  if (!isScatterMode && frame < startFrame - preRoll) return null;

  // micro-vida do bloco
  const visibleFrom = isScatterMode ? 0 : startFrame;
  const lifeScale = life ? mix(1, 1.03, prog(frame, visibleFrom, visibleFrom + 90, FLUID)) : 1;
  const lifeY = life ? wiggle(`${seed}-life`, frame, 3, 0.03) : 0;

  // wipe: máscara diagonal no bloco
  let clipPath: string | undefined;
  let wipeP = 1;
  if (mode === 'wipe') {
    wipeP = prog(frame, startFrame, startFrame + duration, EXPO_OUT);
    const top = wipeP * (100 + wipeSlant);
    const bottom = top - wipeSlant;
    clipPath = `polygon(-5% -20%, ${top}% -20%, ${bottom}% 120%, -5% 120%)`;
  }

  // ── pop-word: transform do BLOCO (estica → squash elástico → pulso/tremor nos beats)
  let popTransform = '';
  let beatEnv = 0; // 0..1 envoltória do último beat (para tremor por letra)
  let lastBeat = -1;
  if (mode === 'pop-word') {
    const d = frame - startFrame;
    let bx = 1;
    let by = 1;
    let bty = 0;
    let brot = 0;
    if (d < 0) {
      // aproximação esticada (stretch vertical), vindo de baixo/pequena
      const t = EXPO_IN(prog(d, -popFrames, 0));
      const s = mix(0.15, 1, t);
      bx = s * mix(0.7, 0.92, t);
      by = s * mix(1.5, 1.22, t);
      bty = mix(fontSize * 0.5, 0, t);
      brot = mix(-8, 0, t);
    } else {
      const jelly = springAt(d, fps, 0, GELATINA);
      // squash forte no pouso, volta elástica (overshoot inverso da GELATINA)
      bx = 1 + 0.3 * (1 - jelly);
      by = 1 - 0.32 * (1 - jelly);
      const beatList = beats ?? (beatEvery > 0 ? Array.from({ length: 64 }, (_, k) => startFrame + (k + 1) * beatEvery) : []);
      for (const b of beatList) if (b <= frame && b > startFrame) lastBeat = b;
      if (lastBeat >= 0) {
        const db = frame - lastBeat;
        beatEnv = Math.exp(-db / 3.5);
        const kick = springAt(db, fps, 0, GELATINA);
        bx *= 1 + beatScale * (1 - kick) * 1.1;
        by *= 1 + beatScale * (1 - kick) * 0.7;
        brot = (random(`${seed}-br-${lastBeat}`) - 0.5) * 6 * beatEnv;
      }
    }
    popTransform = `translateY(${bty}px) rotate(${brot}deg) scale(${bx}, ${by})`;
  }
  // ── type-beat: frame (relativo) de entrada de cada letra não-espaço
  const typeFrames: number[] = [];
  if (mode === 'type-beat') {
    let k = 0;
    for (const ch of chars) {
      if (ch.trim() === '') typeFrames.push(NaN);
      else {
        typeFrames.push(beats?.[k] ?? startFrame + k * step);
        k++;
      }
    }
  }

  const shadowCss = shadow === false ? undefined : shadow;
  const paintStyle: React.CSSProperties = gradient
    ? {
        backgroundImage: gradient,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        filter: shadowCss ? `drop-shadow(${shadowCss})` : undefined,
      }
    : { color, textShadow: shadowCss };
  if (strokeColor && strokeWidth > 0) {
    paintStyle.WebkitTextStroke = `${strokeWidth}px ${strokeColor}`;
    paintStyle.paintOrder = 'stroke fill';
  }

  const letters = chars.map((ch, i) => {
    const k = orderIndex(i, n, staggerFrom, seed);
    const local = frame - startFrame - k * stagger;
    let tx = 0; // px
    let ty = 0; // em % da altura da letra (yPct) ou px (ty)
    let yPct = 0;
    let sx = 1;
    let sy = 1;
    let rot = 0;
    let op = 1;
    let mask = false;

    if (mode === 'rise') {
      mask = true;
      const s = springAt(local, fps, 0, springCfg);
      yPct = (1 - s) * 115;
      rot = (1 - s) * 6;
    } else if (mode === 'stagger-scale') {
      const s = springAt(local, fps, 0, springCfg);
      sx = sy = Math.max(0, s);
      op = prog(local, 0, 3);
      ty = (1 - s) * fontSize * 0.15;
    } else if (mode === 'slam') {
      if (local < -slamFrames) op = 0;
      else if (local < 0) {
        const t = EXPO_IN(prog(local, -slamFrames, 0));
        sx = sy = mix(slamScale, 1, t);
        ty = mix(-fontSize * 0.35, 0, t);
        op = prog(local, -slamFrames, -slamFrames + 2);
        rot = mix((random(`${seed}-sr-${i}`) - 0.5) * 16, 0, t);
      } else {
        const sq = squashAt(local, fps, 0, 1, springCfg);
        sx = sq.scaleX;
        sy = sq.scaleY;
      }
    } else if (mode === 'wipe') {
      const t = prog(local, 0, duration, EXPO_OUT);
      tx = mix(-fontSize * 0.12, 0, t);
    } else if (mode === 'pop-word') {
      // tremor por letra no beat, on twos (textura de animação tradicional)
      if (beatEnv > 0.02) {
        const ft = Math.floor(frame / 2);
        const amp = (tremor ?? fontSize * 0.02) * beatEnv;
        tx = (random(`${seed}-tx-${i}-${ft}`) - 0.5) * 2 * amp;
        ty = (random(`${seed}-ty-${i}-${ft}`) - 0.5) * 2 * amp;
        rot = (random(`${seed}-tr-${i}-${ft}`) - 0.5) * 8 * beatEnv;
      }
    } else if (mode === 'type-beat') {
      const tf = typeFrames[i];
      if (!Number.isNaN(tf)) {
        const l = frame - tf;
        const hopF = 5; // salto dura 5 f, pousa com squash
        if (l < 0) op = 0;
        else if (l < hopF) {
          const u = l / hopF;
          ty = -Math.sin(Math.PI * u) * fontSize * hop + (1 - u) * fontSize * 0.25;
          const s = mix(0.35, 1, EXPO_OUT(Math.min(1, u * 1.6)));
          sx = s * mix(0.85, 1, u);
          sy = s * mix(1.25, 1, u); // stretch subindo
          rot = (random(`${seed}-hr-${i}`) - 0.5) * 18 * (1 - u);
        } else {
          const sq = squashAt(l, fps, hopF, 0.6, GELATINA);
          sx = sq.scaleX;
          sy = sq.scaleY;
        }
      }
    }

    // saída
    if (exitAt !== undefined && exitKind !== 'none') {
      const kx = Math.round(Math.abs(i - c)); // saídas partem do centro p/ bordas
      const e0 = prog(frame, exitAt + (exitKind === 'scatter' ? kx : k) * exitStagger, exitAt + (exitKind === 'scatter' ? kx : k) * exitStagger + exitDur);
      const ein = EXPO_IN(e0);
      if (e0 > 0) {
        switch (exitKind) {
          case 'up':
            ty += -60 * ein;
            sy *= 1 - ein;
            break;
          case 'down':
            ty += 60 * ein;
            sy *= 1 - ein;
            break;
          case 'whip-up': {
            const w = WHIP(e0);
            ty += -1300 * w;
            sy *= 1 + 0.5 * Math.sin(Math.PI * e0);
            break;
          }
          case 'suck': {
            tx += -(i - c) * fontSize * 0.72 * ein;
            sx *= 1 - ein;
            sy *= 1 - ein;
            break;
          }
          case 'scatter': {
            const a = (random(`${seed}-ang-${i}`) - 0.5) * Math.PI * 1.2 + (i < c ? Math.PI : 0);
            const dist = 380 + random(`${seed}-d-${i}`) * 520;
            const pop = e0 < 0.15 ? 1 + 0.6 * e0 : 1.09 - 0.89 * ein; // pequena antecipação "inchando"
            tx += Math.cos(a) * dist * ein;
            ty += Math.sin(a) * dist * ein - 120 * Math.sin(Math.PI * e0);
            rot += (random(`${seed}-rot-${i}`) - 0.5) * 300 * ein;
            sx *= pop;
            sy *= pop;
            op *= 1 - prog(e0, 0.55, 1);
            break;
          }
        }
      }
    }

    const isSpace = ch.trim() === '';
    const inner = (
      <span
        style={{
          display: 'inline-block',
          transform: `translate(${tx}px, calc(${yPct}% + ${ty}px)) rotate(${rot}deg) scale(${sx}, ${sy})`,
          transformOrigin: mode === 'slam' || mode === 'type-beat' ? '50% 90%' : '50% 75%',
          opacity: op,
          whiteSpace: 'pre',
          width: isSpace ? '0.32em' : undefined,
          ...paintStyle,
          ...letterStyle,
        }}
      >
        {isSpace ? ' ' : ch}
      </span>
    );
    return (
      <span
        key={i}
        style={{
          display: 'inline-block',
          overflow: mask ? 'hidden' : 'visible',
          // folga da máscara para acentos/overshoot sem alterar o layout
          padding: mask ? '0.22em 0.06em 0.12em' : undefined,
          margin: mask ? '-0.22em -0.06em -0.12em' : undefined,
          verticalAlign: 'top',
        }}
      >
        {inner}
      </span>
    );
  });

  const bandX = wipeP * (100 + wipeSlant);
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        fontFamily,
        fontSize,
        fontWeight,
        letterSpacing,
        lineHeight,
        whiteSpace: 'pre',
        transform: `translateY(${lifeY}px) scale(${lifeScale})`,
        ...style,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          clipPath,
          WebkitClipPath: clipPath,
          transform: popTransform || undefined,
          transformOrigin: '50% 85%',
        }}
      >
        {letters}
      </div>
      {mode === 'wipe' && wipeBand && wipeP > 0 && wipeP < 1 ? (
        <div
          style={{
            position: 'absolute',
            top: '-25%',
            bottom: '-25%',
            left: `${bandX - wipeSlant / 2}%`,
            width: '0.28em',
            background: wipeBand,
            transform: `skewX(${(-Math.atan(((wipeSlant / 100) * n * 0.72) / 1.5) * 180) / Math.PI}deg)`,
            borderRadius: '0.14em',
            opacity: 1 - prog(wipeP, 0.85, 1),
          }}
        />
      ) : null}
    </div>
  );
};

export default KineticText;
