import { AbsoluteFill, useCurrentFrame } from "remotion";
import { seeded } from "../lib/random";
import { HEIGHT, WIDTH } from "../config/timeline";

// Partículas de poeira à luz. Posição calculada pelo frame (sem estado nem timers).
// `depth` controla velocidade e tamanho: partículas mais "perto" andam mais rápido.
export const Particles: React.FC<{ count?: number; seed?: number; color?: string; speed?: number }> = ({
  count = 56,
  seed = 7,
  color = "#F3EEE3",
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const rand = seeded(seed);
  const items = Array.from({ length: count }, () => ({
    x: rand() * WIDTH,
    y: rand() * HEIGHT,
    depth: 0.35 + rand() * 0.65,
    phase: rand() * Math.PI * 2,
    size: 1 + rand() * 2.2,
  }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      {items.map((p, i) => {
        const y = (((p.y - frame * 0.6 * p.depth * speed) % HEIGHT) + HEIGHT) % HEIGHT;
        const x = p.x + Math.sin(frame * 0.02 * p.depth + p.phase) * 18 * p.depth;
        const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame * 0.07 + p.phase));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: p.size * p.depth * 2,
              height: p.size * p.depth * 2,
              borderRadius: "50%",
              background: color,
              opacity: 0.22 * p.depth * twinkle,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
