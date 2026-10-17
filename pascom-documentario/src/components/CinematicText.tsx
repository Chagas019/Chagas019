import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { Chapter, Title, sec } from "../data/timeline";
import { colors, fonts } from "../theme";

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Uma linha que sobe de trás de uma máscara, saindo do desfoque. */
const RevealLine: React.FC<{ children: React.ReactNode; delay: number; out: number; style: React.CSSProperties; rise: number }> = ({
  children,
  delay,
  out,
  style,
  rise,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 28], [0, 1], { ...clamp, easing: ease });
  const o = interpolate(frame, [out, out + 18], [1, 0], clamp);
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.14em" }}>
      <div style={{ ...style, transform: `translateY(${(1 - p) * rise}px)`, opacity: p * o, filter: `blur(${(1 - p) * 8 + (1 - o) * 5}px)` }}>{children}</div>
    </div>
  );
};

const handDuration = (text: string) => Math.max(24, text.length * 1.6);

/** Escrita à mão: cada linha é "escrita" da esquerda para a direita, num ritmo humano, não linear. */
const HandLine: React.FC<{ text: string; delay: number; out: number; size: number; tilt: number }> = ({ text, delay, out, size, tilt }) => {
  const frame = useCurrentFrame();
  const raw = interpolate(frame, [delay, delay + handDuration(text)], [0, 1], clamp);
  // a mão acelera e hesita
  const p = Math.min(1, Math.max(0, raw + Math.sin(raw * Math.PI * 3) * 0.025 * (1 - raw)));
  const o = interpolate(frame, [out, out + 20], [1, 0], clamp);
  return (
    <div
      style={{
        fontFamily: fonts.hand,
        fontSize: size,
        lineHeight: 1.9,
        color: colors.ivory,
        whiteSpace: "nowrap",
        transform: `rotate(${tilt}deg)`,
        clipPath: `inset(-40% ${(1 - p) * 100}% -40% 0)`,
        opacity: o,
        filter: `blur(${(1 - o) * 4}px)`,
        textShadow: "0 2px 18px rgba(0,0,0,0.7)",
      }}
    >
      {text}
    </div>
  );
};

const TitleCard: React.FC<{ title: Title }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const portrait = height > width;
  const total = sec(title.end) - sec(title.start);
  const out = total - 20;

  if (title.style === "hero") {
    // O coração do filme. Sem ornamentos: só a frase, grande, assentando no quadro.
    const p = interpolate(frame, [0, 36], [0, 1], { ...clamp, easing: ease });
    const o = interpolate(frame, [out, out + 20], [1, 0], clamp);
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 38% at 50% 50%, rgba(5,4,7,${0.66 * p}), transparent 78%)` }} />
        {title.lines.map((line, i) => {
          const li = interpolate(frame, [i * 9, i * 9 + 30], [0, 1], { ...clamp, easing: ease });
          return (
            <div
              key={line}
              style={{
                position: "relative",
                fontFamily: fonts.display,
                fontStyle: i === 1 ? "italic" : "normal",
                fontSize: unit * (portrait ? 0.128 : 0.115),
                lineHeight: 0.98,
                letterSpacing: `${0.1 - 0.085 * li}em`,
                color: colors.ivory,
                opacity: li,
                filter: `blur(${(1 - li) * 9}px)`,
                transform: `translateY(${(1 - li) * unit * 0.02}px)`,
                textShadow: `0 0 ${unit * 0.06}px rgba(214,165,90,${0.28 * li})`,
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          );
        })}
      </AbsoluteFill>
    );
  }

  if (title.style === "signature") {
    const a = interpolate(frame, [0, 42], [0, 1], { ...clamp, easing: ease });
    const b = interpolate(frame, [30, 70], [0, 1], { ...clamp, easing: ease });
    const o = interpolate(frame, [out - 10, out + 20], [1, 0], clamp);
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
        <div style={{ fontFamily: fonts.mono, fontSize: unit * 0.027, letterSpacing: "0.42em", marginRight: "-0.42em", color: colors.gold, opacity: b * 0.9, marginBottom: unit * 0.02 }}>
          PASTORAL DA COMUNICAÇÃO
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: unit * 0.2,
            lineHeight: 1,
            letterSpacing: `${0.12 - 0.08 * a}em`,
            marginRight: `-${0.12 - 0.08 * a}em`,
            color: colors.ivory,
            opacity: a,
            filter: `blur(${(1 - a) * 10}px)`,
          }}
        >
          {title.lines[0]}
        </div>
        <div
          style={{
            fontFamily: fonts.editorial,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: unit * 0.056,
            color: colors.goldLight,
            opacity: b,
            marginTop: unit * 0.02,
            transform: `translateY(${(1 - b) * 12}px)`,
          }}
        >
          {title.lines[1]}
        </div>
      </AbsoluteFill>
    );
  }

  if (title.style === "hand" || title.style === "whisper") {
    // A anotação de quem fotografa: letra cursiva, levemente torta, fora do centro.
    let delay = 4;
    return (
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: height * (portrait ? 0.27 : 0.16), paddingLeft: width * 0.09 }}>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 26% at 40% 68%, rgba(5,4,7,0.5), transparent 80%)" }} />
        {title.lines.map((line, i) => {
          const d = delay;
          delay += handDuration(line) * 0.85;
          return <HandLine key={line} text={line} delay={d} out={out} size={unit * (portrait ? 0.064 : 0.054)} tilt={-2.2 + i * 0.6} />;
        })}
      </AbsoluteFill>
    );
  }

  // statement: diagramação editorial, alinhada à esquerda; a segunda linha em itálico responde à primeira.
  return (
    <AbsoluteFill style={{ justifyContent: "center", paddingLeft: width * 0.09, paddingRight: width * 0.09 }}>
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,4,7,0.62), rgba(5,4,7,0.25) 70%, transparent)" }} />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        {title.lines.map((line, i) => (
          <RevealLine
            key={line}
            delay={i * 12}
            out={out}
            rise={unit * 0.06}
            style={{
              fontFamily: fonts.editorial,
              fontWeight: 300,
              fontStyle: i === 1 ? "italic" : "normal",
              fontSize: unit * (portrait ? 0.084 : 0.072),
              lineHeight: 1.06,
              letterSpacing: "-0.015em",
              color: i === 1 ? colors.goldLight : colors.ivory,
              textShadow: "0 2px 24px rgba(0,0,0,0.6)",
            }}
          >
            {line}
          </RevealLine>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Cartela de capítulo, como num documentário: número romano e nome datilografado. */
const ChapterCard: React.FC<{ chapter: Chapter }> = ({ chapter }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const total = sec(chapter.end) - sec(chapter.start);
  const label = chapter.name.toUpperCase();
  // máquina de escrever: cada letra num tempo ligeiramente diferente
  let shown = 0;
  let t = 10;
  for (let i = 0; i < label.length; i++) {
    t += 1.4 + random(`${chapter.id}-${i}`) * 1.8;
    if (frame >= t) shown = i + 1;
  }
  const num = interpolate(frame, [0, 22], [0, 1], { ...clamp, easing: ease });
  const o = interpolate(frame, [total - 18, total], [1, 0], clamp);
  const caret = shown < label.length || Math.floor(frame / 8) % 2 === 0;
  return (
    <AbsoluteFill style={{ paddingTop: height * (height > width ? 0.13 : 0.1), paddingLeft: width * 0.09, opacity: o }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: unit * 0.03 }}>
        <span style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: unit * 0.07, color: colors.goldLight, opacity: num, filter: `blur(${(1 - num) * 6}px)` }}>
          {chapter.number}
        </span>
        <span style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: unit * 0.026, letterSpacing: "0.32em", color: colors.ivory, opacity: 0.88 }}>
          {label.slice(0, shown)}
          <span style={{ opacity: caret ? 0.8 : 0 }}>▌</span>
        </span>
      </div>
      <div style={{ width: unit * 0.18 * num, height: 1, background: colors.ivory, opacity: 0.35, marginTop: unit * 0.012 }} />
    </AbsoluteFill>
  );
};

/** Frases na tela e cartelas de capítulo, cada uma no momento em que acrescenta sentido. */
export const CinematicText: React.FC<{ titles: Title[]; chapters: Chapter[] }> = ({ titles, chapters }) => (
  <>
    {chapters.map((c) => (
      <Sequence key={c.id} name={`capítulo ${c.number}`} from={sec(c.start)} durationInFrames={Math.max(1, sec(c.end) - sec(c.start))} layout="none">
        <ChapterCard chapter={c} />
      </Sequence>
    ))}
    {titles.map((title) => (
      <Sequence key={title.id} name={`título ${title.id}`} from={sec(title.start)} durationInFrames={Math.max(1, sec(title.end) - sec(title.start))} layout="none">
        <TitleCard title={title} />
      </Sequence>
    ))}
  </>
);
