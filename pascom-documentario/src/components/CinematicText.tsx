import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Title, sec } from "../data/timeline";
import { colors, fonts } from "../theme";

const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** Uma linha que sobe de trás de uma máscara, saindo do desfoque. */
const RevealLine: React.FC<{ children: React.ReactNode; delay: number; out: number; style: React.CSSProperties; rise: number }> = ({
  children,
  delay,
  out,
  style,
  rise,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const o = interpolate(frame, [out, out + 18], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ overflow: "hidden", paddingBottom: "0.12em" }}>
      <div
        style={{
          ...style,
          transform: `translateY(${(1 - p) * rise}px)`,
          opacity: p * o,
          filter: `blur(${(1 - p) * 10 + (1 - o) * 6}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const TitleCard: React.FC<{ title: Title }> = ({ title }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height);
  const total = sec(title.end) - sec(title.start);
  const out = total - 20;

  if (title.style === "hero") {
    // O coração do filme: tipografia grande, tracking que se assenta, filetes dourados.
    const p = interpolate(frame, [0, 34], [0, 1], { extrapolateRight: "clamp", easing: ease });
    const o = interpolate(frame, [out, out + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const rule = interpolate(frame, [18, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
    const lineStyle: React.CSSProperties = {
      fontFamily: fonts.serif,
      fontWeight: 500,
      fontSize: unit * (width > height ? 0.1 : 0.084),
      lineHeight: 1.02,
      color: colors.ivory,
      letterSpacing: `${0.24 - 0.17 * p}em`,
      textShadow: `0 0 ${unit * 0.05}px rgba(214,165,90,${0.35 * p})`,
      whiteSpace: "nowrap",
    };
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 40% at 50% 50%, rgba(5,4,7,${0.62 * p}), transparent 75%)` }} />
        <div style={{ width: unit * 0.5 * rule, height: 2, background: colors.gold, opacity: 0.85, marginBottom: unit * 0.06 }} />
        {title.lines.map((line, i) => (
          <div key={line} style={{ ...lineStyle, opacity: interpolate(frame, [i * 8, i * 8 + 26], [0, 1], { extrapolateRight: "clamp" }), filter: `blur(${(1 - p) * 8}px)` }}>
            {line}
          </div>
        ))}
        <div style={{ width: unit * 0.5 * rule, height: 2, background: colors.gold, opacity: 0.85, marginTop: unit * 0.06 }} />
      </AbsoluteFill>
    );
  }

  if (title.style === "signature") {
    const a = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp", easing: ease });
    const b = interpolate(frame, [32, 72], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
    const o = interpolate(frame, [out - 10, out + 20], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
        <div
          style={{
            fontFamily: fonts.sans,
            fontWeight: 600,
            fontSize: unit * 0.075,
            letterSpacing: `${0.9 - 0.35 * a}em`,
            marginRight: `-${0.9 - 0.35 * a}em`,
            color: colors.ivory,
            opacity: a,
          }}
        >
          {title.lines[0]}
        </div>
        <div style={{ width: unit * 0.08, height: 1.5, background: colors.gold, margin: `${unit * 0.035}px 0`, opacity: b }} />
        <div style={{ fontFamily: fonts.serif, fontStyle: "italic", fontSize: unit * 0.06, color: colors.goldLight, opacity: b, transform: `translateY(${(1 - b) * 14}px)` }}>
          {title.lines[1]}
        </div>
      </AbsoluteFill>
    );
  }

  const whisper = title.style === "whisper";
  const style: React.CSSProperties = {
    fontFamily: fonts.serif,
    fontStyle: whisper ? "italic" : "normal",
    fontWeight: whisper ? 400 : 500,
    fontSize: unit * (whisper ? 0.066 : 0.074),
    lineHeight: 1.12,
    color: colors.ivory,
    textAlign: "center",
    textShadow: "0 2px 24px rgba(0,0,0,0.65)",
  };
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: whisper ? height * 0.42 : 0 }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 30% at 50% ${whisper ? 71 : 50}%, rgba(5,4,7,0.55), transparent 80%)` }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        {title.lines.map((line, i) => (
          <RevealLine key={line} delay={i * 10} out={out} style={style} rise={unit * 0.05}>
            {line}
          </RevealLine>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Frases na tela, cada uma no momento em que acrescenta sentido. */
export const CinematicText: React.FC<{ titles: Title[] }> = ({ titles }) => (
  <>
    {titles.map((title) => (
      <Sequence key={title.id} name={`título ${title.id}`} from={sec(title.start)} durationInFrames={Math.max(1, sec(title.end) - sec(title.start))} layout="none">
        <TitleCard title={title} />
      </Sequence>
    ))}
  </>
);
