import React from "react";
import { interpolate } from "remotion";
import { colors, fonts } from "../../theme";
import { PlateProps, clamp01, personPath, seeded } from "./util";

/** Uma "fotografia" abstrata: luz quente e silhuetas, nunca imagem de banco fingida. */
const Photo: React.FC<{ x: number; y: number; w: number; h: number; seed: number; exposure: number }> = ({ x, y, w, h, seed, exposure }) => {
  const s = seeded(`ph${seed}`, 3);
  const kind = seed % 3;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#120c08" />
      <g opacity={exposure}>
        <rect x={x} y={y} width={w} height={h} fill={kind === 0 ? "#5a3a1f" : kind === 1 ? "#3d2a1a" : "#4b3322"} />
        <ellipse cx={x + w * (0.3 + s[0].a * 0.4)} cy={y + h * 0.35} rx={w * 0.45} ry={h * 0.32} fill={colors.goldLight} opacity={0.55} />
        {kind === 0 && (
          <>
            <path d={personPath(x + w * 0.42, y + h * 1.0, w * 0.55)} fill="#1a110a" />
            <path d={personPath(x + w * 0.62, y + h * 1.0, w * 0.5)} fill="#22160d" />
          </>
        )}
        {kind === 1 && (
          <>
            <rect x={x + w * 0.48} y={y + h * 0.18} width={w * 0.04} height={h * 0.4} fill="#1c130b" />
            <rect x={x + w * 0.38} y={y + h * 0.28} width={w * 0.24} height={w * 0.04} fill="#1c130b" />
            {[0.15, 0.35, 0.55, 0.75].map((k) => (
              <path key={k} d={personPath(x + w * k + w * 0.05, y + h * 1.02, w * 0.3)} fill="#120c07" />
            ))}
          </>
        )}
        {kind === 2 && (
          <>
            {[0.2, 0.4, 0.6, 0.8].map((k) => (
              <circle key={k} cx={x + w * k} cy={y + h * (0.45 + 0.1 * Math.sin(k * 9))} r={w * 0.05} fill={colors.candle} opacity={0.8} />
            ))}
            <path d={personPath(x + w * 0.5, y + h * 1.0, w * 0.6)} fill="#1a110a" />
          </>
        )}
      </g>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke="#f4ead8" strokeOpacity={0.12} strokeWidth={w * 0.01} />
    </g>
  );
};

/**
 * mode "metrics": um feed de fotos com curtidas e números que se apagam,
 * até restar uma única imagem — maior do que curtidas, maior do que números.
 * mode "develop": noite de edição, uma foto ganha exposição enquanto as horas passam.
 */
export const ContactSheetPlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H, props }) => {
  const mode = (props.mode as string) ?? "metrics";
  const t = frame / 30;

  if (mode === "develop") {
    const exposure = interpolate(progress, [0.05, 0.85], [0.05, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const minutes = Math.floor(interpolate(progress, [0, 1], [22 * 60 + 47, 25 * 60 + 12]));
    const hh = String(Math.floor(minutes / 60) % 24).padStart(2, "0");
    const mm = String(minutes % 60).padStart(2, "0");
    const pw = W * 0.72;
    const ph = pw * 1.25;
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="cs-desk" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#1d2230" />
            <stop offset="100%" stopColor="#040406" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#cs-desk)" />
        <rect x={(W - pw) / 2 - W * 0.04} y={H * 0.16 - W * 0.04} width={pw + W * 0.08} height={ph + W * 0.08} rx={W * 0.015} fill="#0b0c11" stroke="#262a36" strokeWidth={W * 0.003} />
        <Photo x={(W - pw) / 2} y={H * 0.16} w={pw} h={ph} seed={0} exposure={exposure} />
        {/* histograma ganhando forma */}
        <g transform={`translate(${(W - pw) / 2}, ${H * 0.16 + ph + W * 0.08})`}>
          {Array.from({ length: 48 }).map((_, i) => {
            const v = Math.exp(-Math.pow((i - 30 * exposure - 6) / (7 + 4 * exposure), 2)) * (0.4 + 0.6 * exposure);
            return <rect key={i} x={(i * pw) / 48} y={-v * W * 0.1} width={pw / 52} height={v * W * 0.1} fill="#f4ead8" opacity={0.35} />;
          })}
        </g>
        <text x={W / 2} y={H * 0.16 + ph + W * 0.2} fill="#f4ead8" opacity={0.55} fontFamily={fonts.sans} fontSize={W * 0.03} textAnchor="middle" letterSpacing={W * 0.006}>
          {hh}:{mm}
        </text>
        <rect width={W} height={H} fill={colors.gold} opacity={0.04 * exposure} style={{ mixBlendMode: "screen" }} />
      </svg>
    );
  }

  const cols = 2;
  const cw = W * 0.4;
  const chh = cw * 1.2;
  const gapX = W * 0.06;
  const gapY = W * 0.16;
  const scroll = progress * chh * 1.4;
  const fadeNumbers = clamp01((progress - 0.35) / 0.3);
  const isolate = clamp01((progress - 0.6) / 0.3);
  const tiles = seeded("feed", 10);
  const startX = (W - (cols * cw + gapX)) / 2;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <rect width={W} height={H} fill="#07070a" />
      {tiles.map((tile) => {
        const col = tile.i % cols;
        const row = Math.floor(tile.i / cols);
        const x = startX + col * (cw + gapX);
        const y = H * 0.08 + row * (chh + gapY) - scroll;
        const chosen = tile.i === 4;
        const likes = Math.floor(80 + tile.a * 2400 + t * 40 * tile.b);
        const op = chosen ? 1 : 1 - isolate * 0.85;
        return (
          <g key={tile.i} opacity={op}>
            <Photo x={x} y={y} w={cw} h={chh} seed={tile.i} exposure={chosen ? 1 : 0.55 + 0.3 * tile.c} />
            <g opacity={1 - fadeNumbers} fontFamily={fonts.sans} fontSize={W * 0.026} fill="#f4ead8">
              <path
                d={`M ${x + W * 0.02} ${y + chh + W * 0.045} c ${-W * 0.012} ${-W * 0.012} ${-W * 0.004} ${-W * 0.026} ${W * 0.008} ${-W * 0.016} c ${W * 0.012} ${-W * 0.01} ${W * 0.02} ${W * 0.004} ${W * 0.008} ${W * 0.016} Z`}
                fill={colors.glassRuby}
              />
              <text x={x + W * 0.05} y={y + chh + W * 0.05}>{likes.toLocaleString("pt-BR")}</text>
              <text x={x + cw} y={y + chh + W * 0.05} textAnchor="end" opacity={0.6}>
                {Math.floor(tile.d * 90 + 3)} coment.
              </text>
            </g>
          </g>
        );
      })}
      <rect width={W} height={H} fill={colors.gold} opacity={0.05 * isolate} style={{ mixBlendMode: "screen" }} />
    </svg>
  );
};
