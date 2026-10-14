import { useCurrentFrame } from "remotion";
import { rise } from "../lib/motion";

// Título cinético: cada letra entra com desfoque, deslocamento e atraso próprio.
// `start` é o frame local da primeira letra; `stagger` é o atraso entre letras.
export const KineticText: React.FC<{
  text: string;
  start: number;
  stagger?: number;
  duration?: number;
  style?: React.CSSProperties;
  offset?: number;
}> = ({ text, start, stagger = 1.4, duration = 26, style, offset = 26 }) => {
  const frame = useCurrentFrame();
  return (
    <span style={{ display: "inline-block", whiteSpace: "pre-wrap", ...style }} aria-label={text}>
      {Array.from(text).map((ch, i) => {
        const p = rise(frame, start + i * stagger, duration);
        return (
          <span
            key={i}
            aria-hidden
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              opacity: p,
              transform: `translateY(${(1 - p) * offset}px)`,
              filter: `blur(${(1 - p) * 12}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
};
