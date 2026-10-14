import { useCurrentFrame } from "remotion";
import { BRAND } from "../config/brand";
import { SCENES } from "../config/timeline";
import { rise } from "../lib/motion";

// Capítulos do filme, na mesma ordem das cenas.
export const CHAPTERS = ["Despertar", "Memória", "Identidade", "Conexão", "Assinatura"] as const;
const STARTS = [SCENES.despertar.from, SCENES.memoria.from, SCENES.identidade.from, SCENES.conexao.from, SCENES.assinatura.from];

// Moldura de filme: cantos finos dourados e rótulo vertical com o capítulo atual.
// Substitui a barra de progresso, que lembrava os Stories do Instagram.
export const FilmFrame: React.FC = () => {
  const frame = useCurrentFrame();
  let idx = 0;
  STARTS.forEach((s, i) => {
    if (frame >= s) idx = i;
  });
  const p = rise(frame - STARTS[idx], 0, 24);
  const corner = (pos: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 64, height: 64, border: `2px solid ${BRAND.colors.goldDim}`, ...pos }} />
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {corner({ top: 56, left: 56, borderRight: "none", borderBottom: "none" })}
      {corner({ top: 56, right: 56, borderLeft: "none", borderBottom: "none" })}
      {corner({ bottom: 56, left: 56, borderRight: "none", borderTop: "none" })}
      {corner({ bottom: 56, right: 56, borderLeft: "none", borderTop: "none" })}
      <div
        style={{
          position: "absolute",
          left: 56 - 200 + 16,
          top: 960 - 16,
          width: 400,
          transform: "rotate(-90deg)",
          textAlign: "center",
          fontFamily: BRAND.fonts.text,
          fontSize: 22,
          letterSpacing: "0.34em",
          textTransform: "uppercase",
          color: BRAND.colors.ivoryDim,
          opacity: p,
        }}
      >
        {String(idx + 1).padStart(2, "0")} · {CHAPTERS[idx]}
      </div>
    </div>
  );
};
