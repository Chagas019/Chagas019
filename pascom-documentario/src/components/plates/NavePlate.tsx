import React from "react";
import { interpolate } from "remotion";
import { colors } from "../../theme";
import { PlateProps, personPath, seeded, smoothNoise } from "./util";

/**
 * A nave da igreja em perspectiva: colunas, arcos, bancos e o altar ao fundo.
 * people: assembleia nos bancos. glory: luz forte do alto (clímax).
 * cross: a cruz iluminada no centro (Cristo é o centro). fadeToDark: escurece no envio.
 */
export const NavePlate: React.FC<PlateProps> = ({ progress, frame, width: W, height: H, props }) => {
  const people = Boolean(props.people);
  const glory = Boolean(props.glory);
  const cross = Boolean(props.cross) || glory;
  const fadeToDark = Boolean(props.fadeToDark);
  const t = frame / 30;
  const vx = W * 0.5;
  const vy = H * 0.43;
  const depthLevels = 7;
  const heads = seeded("nave-heads", 40);
  const light = glory ? 1 : 0.6;
  const dark = fadeToDark ? interpolate(progress, [0.35, 1], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;

  // projeção simples: z de 1 (perto) a 0.08 (altar)
  const project = (xw: number, yw: number, z: number) => ({ x: vx + (xw * W) / (z * 2.2), y: vy + (yw * H) / (z * 2.2) });

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="nv-altar" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3d8" stopOpacity={0.95} />
          <stop offset="35%" stopColor={colors.goldLight} stopOpacity={0.45} />
          <stop offset="100%" stopColor={colors.gold} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="nv-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2016" />
          <stop offset="100%" stopColor="#0a0807" />
        </linearGradient>
        <linearGradient id="nv-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.goldLight} stopOpacity={0.5} />
          <stop offset="100%" stopColor={colors.goldLight} stopOpacity={0} />
        </linearGradient>
        <filter id="nv-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={W * 0.02} />
        </filter>
        <filter id="nv-slight">
          <feGaussianBlur stdDeviation={W * 0.002} />
        </filter>
      </defs>
      <rect width={W} height={H} fill="#0b0908" />
      <path d={`M 0 ${H} L ${vx - W * 0.05} ${vy + H * 0.02} L ${vx + W * 0.05} ${vy + H * 0.02} L ${W} ${H} Z`} fill="url(#nv-floor)" />

      {/* abside iluminada */}
      <ellipse cx={vx} cy={vy - H * 0.02} rx={W * 0.32 * (1 + 0.3 * light)} ry={H * 0.16 * (1 + 0.3 * light)} fill="url(#nv-altar)" opacity={0.6 + 0.4 * light} />
      <path d={`M ${vx - W * 0.07} ${vy + H * 0.02} L ${vx - W * 0.07} ${vy - H * 0.07} Q ${vx} ${vy - H * 0.13} ${vx + W * 0.07} ${vy - H * 0.07} L ${vx + W * 0.07} ${vy + H * 0.02} Z`} fill="#fff0d0" opacity={0.25 + 0.3 * light} />
      <rect x={vx - W * 0.06} y={vy + H * 0.005} width={W * 0.12} height={H * 0.018} fill="#f5e6c8" opacity={0.85} />

      {cross && (
        <g>
          <circle cx={vx} cy={vy - H * 0.06} r={W * 0.05} fill={colors.goldLight} opacity={0.35 + 0.15 * smoothNoise("halo", t * 0.5)} filter="url(#nv-soft)" />
          <rect x={vx - W * 0.0045} y={vy - H * 0.1} width={W * 0.009} height={H * 0.085} fill="#2a1c10" />
          <rect x={vx - W * 0.026} y={vy - H * 0.083} width={W * 0.052} height={W * 0.009} fill="#2a1c10" />
        </g>
      )}

      {/* raios do alto */}
      {(glory || light > 0.5) && (
        <g filter="url(#nv-soft)" style={{ mixBlendMode: "screen" }} opacity={glory ? 0.9 : 0.35}>
          {[-0.18, -0.05, 0.08, 0.2].map((k, i) => (
            <path
              key={i}
              d={`M ${vx + W * k - W * 0.02} 0 L ${vx + W * k + W * 0.02} 0 L ${vx + W * k * 0.3 + W * 0.09} ${H * 0.8} L ${vx + W * k * 0.3 - W * 0.09} ${H * 0.8} Z`}
              fill="url(#nv-beam)"
              opacity={0.5 + 0.5 * smoothNoise(`gb${i}`, t * 0.4)}
            />
          ))}
        </g>
      )}

      {/* colunas e arcos, de trás para frente */}
      {Array.from({ length: depthLevels }).map((_, k) => {
        const z = 0.12 + (k / (depthLevels - 1)) * 0.9;
        const zz = 1.02 - z + 0.12;
        const left = project(-0.42, -0.9, zz);
        const leftB = project(-0.42, 0.62, zz);
        const right = project(0.42, -0.9, zz);
        const colW = (W * 0.06) / zz;
        const shade = Math.round(10 + 22 * (1 - k / depthLevels));
        const fill = `rgb(${shade + 8},${shade + 4},${shade})`;
        return (
          <g key={k}>
            <rect x={left.x - colW} y={left.y} width={colW} height={leftB.y - left.y + H} fill={fill} />
            <rect x={right.x} y={right.y} width={colW} height={leftB.y - left.y + H} fill={fill} />
            <path
              d={`M ${left.x} ${left.y} Q ${vx} ${left.y - (right.x - left.x) * 0.55} ${right.x} ${right.y}`}
              stroke={fill}
              strokeWidth={colW * 0.6}
              fill="none"
            />
            <rect x={left.x - colW * 0.15} y={left.y} width={colW * 0.15} height={leftB.y - left.y + H} fill={colors.gold} opacity={0.06 + 0.06 * light} />
          </g>
        );
      })}

      {/* bancos */}
      {Array.from({ length: 9 }).map((_, r) => {
        const zz = 0.22 + r * 0.1;
        const a = project(-0.36, 0.42, zz);
        const b = project(-0.04, 0.42, zz);
        const c = project(0.04, 0.42, zz);
        const d = project(0.36, 0.42, zz);
        const h = (H * 0.035) / zz;
        return (
          <g key={r}>
            <rect x={a.x} y={a.y - h} width={b.x - a.x} height={h} fill="#120d09" />
            <rect x={c.x} y={c.y - h} width={d.x - c.x} height={h} fill="#120d09" />
            {people &&
              heads
                .filter((hd) => Math.floor(hd.a * 9) === r)
                .map((hd) => {
                  const side = hd.b > 0.5;
                  const x0 = side ? c.x + (d.x - c.x) * hd.c : a.x + (b.x - a.x) * hd.c;
                  return <path key={hd.i} d={personPath(x0, a.y - h * 0.6, (W * 0.05) / zz)} fill="#080605" filter="url(#nv-slight)" />;
                })}
          </g>
        );
      })}
      <rect width={W} height={H} fill="black" opacity={dark} />
    </svg>
  );
};
