import { useCurrentFrame } from "remotion";
import { BRAND } from "../config/brand";
import { SCENES } from "../config/timeline";
import { rise } from "../lib/motion";

// Capítulos do filme, na mesma ordem das cenas.
export const CHAPTERS = ["Despertar", "Memória", "Identidade", "Conexão", "Assinatura"] as const;
const STARTS = [SCENES.despertar.from, SCENES.memoria.from, SCENES.identidade.from, SCENES.conexao.from, SCENES.assinatura.from];

// Barra de progresso com o capítulo atual. Fica no alto, dentro da área segura do Reels.
export const ChapterBar: React.FC = () => {
  const frame = useCurrentFrame();
  let idx = 0;
  STARTS.forEach((s, i) => {
    if (frame >= s) idx = i;
  });
  const since = frame - STARTS[idx];
  const p = rise(since, 0, 22);
  return (
    <div style={{ position: "absolute", top: 170, left: 90, right: 90, fontFamily: BRAND.fonts.text, pointerEvents: "none" }}>
      <div style={{ display: "flex", gap: 10 }}>
        {CHAPTERS.map((_, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(243,238,227,0.2)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: done ? "100%" : active ? `${p * 100}%` : "0%",
                  background: BRAND.colors.gold,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 18,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: BRAND.colors.ivoryDim,
        }}
      >
        <span style={{ opacity: p, transform: `translateY(${(1 - p) * 12}px)` }}>
          {String(idx + 1).padStart(2, "0")} · {CHAPTERS[idx]}
        </span>
        <span>{BRAND.name}</span>
      </div>
    </div>
  );
};
