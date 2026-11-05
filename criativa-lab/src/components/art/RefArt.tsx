import { memo } from "react";
import type { Reference } from "@/lib/types";

/** PRNG determinístico (mulberry32) — a mesma semente gera sempre a mesma arte. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZES = { portrait: [400, 520], landscape: [520, 380], square: [440, 440] } as const;

type Props = Pick<Reference, "kind" | "palette" | "seed" | "ratio" | "title"> & { className?: string };

/**
 * Composições generativas em SVG para a biblioteca de referências.
 * Cada tipo (fotografia, cartaz, tipografia…) tem sua própria gramática visual.
 */
function RefArtBase({ kind, palette, seed, ratio, title, className }: Props) {
  const [W, H] = SIZES[ratio];
  const r = rng(seed);
  const p = (i: number) => palette[i % palette.length];
  const bg = palette[0];
  const id = `ra-${seed}`;
  let body: React.ReactNode;

  switch (kind) {
    case "fotografia": {
      // "Fotografia" abstrata: luz volumétrica, horizonte e figura em silhueta.
      const lightX = W * (0.2 + r() * 0.6);
      const horizon = H * (0.55 + r() * 0.2);
      const fx = W * (0.25 + r() * 0.5);
      body = (
        <>
          <defs>
            <radialGradient id={`${id}-l`} cx={lightX / W} cy={0.25} r="0.9">
              <stop offset="0" stopColor={p(3)} stopOpacity="0.95" />
              <stop offset="0.35" stopColor={p(2)} stopOpacity="0.55" />
              <stop offset="1" stopColor={bg} stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={p(1)} />
              <stop offset="1" stopColor={bg} />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill={`url(#${id}-g)`} />
          <rect width={W} height={H} fill={`url(#${id}-l)`} />
          {Array.from({ length: 5 }).map((_, i) => (
            <polygon
              key={i}
              points={`${lightX - 20 + i * 8},0 ${lightX + 30 + i * 10},0 ${fx + 120 - i * 60},${H} ${fx - 40 - i * 50},${H}`}
              fill={p(3)}
              opacity={0.04 + i * 0.01}
            />
          ))}
          <rect y={horizon} width={W} height={H - horizon} fill={bg} opacity="0.85" />
          <ellipse cx={fx} cy={horizon + 6} rx={70} ry={6} fill="#000" opacity="0.5" />
          <path
            d={`M${fx - 18},${horizon} L${fx - 14},${horizon - 70} Q${fx},${horizon - 120} ${fx + 14},${horizon - 70} L${fx + 18},${horizon} Z`}
            fill={bg}
          />
          <circle cx={fx} cy={horizon - 128} r={13} fill={bg} />
        </>
      );
      break;
    }
    case "cartaz": {
      const cols = 6;
      const cw = W / cols;
      const big = 1 + Math.floor(r() * 3);
      const word = title.split(" ")[0].toUpperCase();
      const wordSize = Math.min(W * 0.16, (W * 0.9) / (word.length * 0.6));
      body = (
        <>
          <rect width={W} height={H} fill={bg} />
          {Array.from({ length: cols - 1 }).map((_, i) => (
            <line key={i} x1={cw * (i + 1)} x2={cw * (i + 1)} y1={0} y2={H} stroke={p(1)} strokeOpacity="0.08" />
          ))}
          <circle cx={cw * (1 + r() * 4)} cy={H * (0.3 + r() * 0.2)} r={cw * (1.2 + big * 0.5)} fill={p(2)} />
          <rect x={cw * Math.floor(r() * 3)} y={H * 0.62} width={cw * 3} height={14} fill={p(1)} />
          {Array.from({ length: 4 }).map((_, i) => (
            <rect key={i} x={cw * 0.5} y={H * 0.7 + i * 16} width={cw * (2 + r() * 2.5)} height={6} fill={p(1)} opacity={0.75} />
          ))}
          <text x={cw * 0.5} y={H * 0.95} fill={p(1)} fontFamily="var(--font-display)" fontWeight={700} fontSize={wordSize} letterSpacing="-3">
            {word}
          </text>
        </>
      );
      break;
    }
    case "tipografia": {
      const word = title.split(" ")[0];
      body = (
        <>
          <rect width={W} height={H} fill={bg} />
          <text
            x={-10}
            y={H * 0.62}
            fill={p(1)}
            fontFamily={seed % 2 ? "var(--font-serif)" : "var(--font-display)"}
            fontStyle={seed % 2 ? "italic" : "normal"}
            fontWeight={seed % 2 ? 400 : 800}
            fontSize={H * 0.62}
            letterSpacing="-6"
          >
            {word.slice(0, 2)}
          </text>
          <text x={W * 0.06} y={H * 0.92} fill={p(2)} fontFamily="var(--font-mono)" fontSize={13} letterSpacing="3">
            AaBbCc 0123 — {word.toUpperCase()}
          </text>
          <line x1={0} x2={W} y1={H * 0.62} y2={H * 0.62} stroke={p(2)} strokeDasharray="4 6" opacity="0.7" />
          <line x1={0} x2={W} y1={H * 0.36} y2={H * 0.36} stroke={p(2)} strokeDasharray="4 6" opacity="0.4" />
        </>
      );
      break;
    }
    case "paleta": {
      const n = palette.length;
      body = (
        <>
          {palette.map((c, i) => (
            <rect key={c + i} x={(W / n) * i} y={0} width={W / n + 1} height={H} fill={c} />
          ))}
          {palette.map((c, i) => (
            <text
              key={`t${i}`}
              x={(W / n) * i + 10}
              y={H - 14}
              fontFamily="var(--font-mono)"
              fontSize={11}
              fill={i === 0 || i < n / 2 ? "#f3f3ee" : "#0a0a0a"}
              opacity="0.85"
            >
              {c.toUpperCase()}
            </text>
          ))}
        </>
      );
      break;
    }
    case "identidade": {
      const shapes = Array.from({ length: 9 });
      const s = Math.min(W, H) / 4;
      body = (
        <>
          <rect width={W} height={H} fill={bg} />
          {shapes.map((_, i) => {
            const x = (W - s * 3) / 2 + (i % 3) * s;
            const y = (H - s * 3) / 2 + Math.floor(i / 3) * s;
            const t = Math.floor(r() * 4);
            const c = p(1 + (i % (palette.length - 1)));
            if (t === 0) return <rect key={i} x={x + 6} y={y + 6} width={s - 12} height={s - 12} fill={c} />;
            if (t === 1) return <circle key={i} cx={x + s / 2} cy={y + s / 2} r={s / 2 - 6} fill={c} />;
            if (t === 2) return <path key={i} d={`M${x + 6},${y + s - 6} A${s - 12},${s - 12} 0 0 1 ${x + s - 6},${y + 6} L${x + s - 6},${y + s - 6} Z`} fill={c} />;
            return <polygon key={i} points={`${x + s / 2},${y + 6} ${x + s - 6},${y + s - 6} ${x + 6},${y + s - 6}`} fill={c} />;
          })}
        </>
      );
      break;
    }
    case "campanha": {
      body = (
        <>
          <rect width={W} height={H} fill={bg} />
          <rect x={W * 0.06} y={H * 0.08} width={W * 0.88} height={H * 0.6} fill={p(1)} />
          <circle cx={W * (0.3 + r() * 0.4)} cy={H * 0.38} r={H * 0.16} fill={p(2)} />
          <rect x={W * 0.06} y={H * 0.74} width={W * 0.55} height={18} fill={p(1)} />
          <rect x={W * 0.06} y={H * 0.82} width={W * 0.35} height={10} fill={p(1)} opacity="0.5" />
          <text x={W * 0.94} y={H * 0.92} textAnchor="end" fontFamily="var(--font-serif)" fontStyle="italic" fontSize={42} fill={p(2)}>
            ?
          </text>
        </>
      );
      break;
    }
    case "direcao-de-arte": {
      body = (
        <>
          <rect width={W} height={H} fill={p(0)} />
          <rect y={H * 0.68} width={W} height={H * 0.32} fill={p(1)} />
          <path d={`M${W * 0.18},${H * 0.68} L${W * 0.9},${H * 0.92} L${W},${H * 0.92} L${W},${H * 0.68}Z`} fill="#000" opacity="0.18" />
          <rect x={W * 0.18} y={H * 0.36} width={W * 0.2} height={H * 0.32} rx={W * 0.1} fill={p(2)} />
          <circle cx={W * 0.55} cy={H * 0.58} r={H * 0.1} fill={p(3)} />
          <rect x={W * 0.66} y={H * 0.22} width={W * 0.16} height={H * 0.46} fill={p(2)} opacity="0.9" />
        </>
      );
      break;
    }
    default: {
      // composição
      const n = 7 + Math.floor(r() * 5);
      const breakAt = Math.floor(r() * n);
      body = (
        <>
          <rect width={W} height={H} fill={bg} />
          {Array.from({ length: n }).map((_, i) => {
            const x = (W / (n + 1)) * (i + 1);
            const special = i === breakAt;
            return (
              <rect
                key={i}
                x={x - 6}
                y={special ? H * 0.2 : H * 0.42}
                width={12}
                height={special ? H * 0.6 : H * 0.16}
                fill={special ? p(3) : p(1)}
                opacity={special ? 1 : 0.8}
              />
            );
          })}
          <circle cx={W * 0.86} cy={H * 0.16} r={20} fill="none" stroke={p(2)} strokeWidth={2} />
        </>
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Composição visual: ${title}`}
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      {body}
    </svg>
  );
}

export const RefArt = memo(RefArtBase);
