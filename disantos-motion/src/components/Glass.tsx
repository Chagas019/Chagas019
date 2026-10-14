import { useCurrentFrame } from "remotion";
import { BRAND } from "../config/brand";
import { rise } from "../lib/motion";

// Superfície de vidro: fundo translúcido, desfoque e borda clara. Base dos cards e painéis.
const glass: React.CSSProperties = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
  backdropFilter: "blur(22px)",
  WebkitBackdropFilter: "blur(22px)",
  border: "1px solid rgba(255,255,255,0.22)",
  boxShadow: "0 30px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
};

// Card flutuante de vidro com rótulo e legenda. Entra com inclinação e flutua suavemente.
export const GlassCard: React.FC<{
  x: number;
  y: number;
  rotate: number;
  title: string;
  sub: string;
  start: number;
  phase?: number;
}> = ({ x, y, rotate, title, sub, start, phase = 0 }) => {
  const frame = useCurrentFrame();
  const p = rise(frame, start, 30);
  const bob = Math.sin(frame * 0.045 + phase) * 10;
  return (
    <div
      style={{
        ...glass,
        position: "absolute",
        left: x,
        top: y + bob,
        width: 300,
        height: 360,
        boxSizing: "border-box",
        padding: "40px 34px",
        borderRadius: 44,
        opacity: p,
        transform: `translateY(${(1 - p) * 60}px) rotate(${rotate + (1 - p) * 8}deg) scale(${0.92 + 0.08 * p})`,
        fontFamily: BRAND.fonts.text,
        color: BRAND.colors.ivory,
        overflow: "hidden",
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 28, color: BRAND.colors.ivoryDim, marginTop: 6 }}>{sub}</div>
      <div
        style={{
          position: "absolute",
          left: 34,
          right: 34,
          bottom: 40,
          height: 120,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${BRAND.colors.gold}, ${BRAND.colors.navyMid})`,
          opacity: 0.55,
        }}
      />
    </div>
  );
};

// Painel em vidro com ondas animadas, que acompanham a trilha. Rótulo embaixo.
export const GlassWave: React.FC<{ label: string; top: number; start: number; bars?: number }> = ({
  label,
  top,
  start,
  bars = 26,
}) => {
  const frame = useCurrentFrame();
  const p = rise(frame, start, 28);
  return (
    <div
      style={{
        ...glass,
        position: "absolute",
        left: 90,
        right: 90,
        top,
        height: 170,
        borderRadius: 48,
        boxSizing: "border-box",
        padding: "34px 40px",
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        fontFamily: BRAND.fonts.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, height: 72 }}>
        {Array.from({ length: bars }, (_, i) => {
          const h = 10 + 58 * Math.abs(Math.sin(frame * 0.18 + i * 0.55)) * (0.5 + 0.5 * Math.sin(i * 1.3 + frame * 0.05));
          return (
            <div
              key={i}
              style={{
                width: 6,
                height: h,
                borderRadius: 3,
                background: i % 5 === 0 ? BRAND.colors.gold : BRAND.colors.ivory,
                opacity: 0.85,
              }}
            />
          );
        })}
      </div>
      <div style={{ fontSize: 26, letterSpacing: "0.22em", textTransform: "uppercase", color: BRAND.colors.ivoryDim }}>{label}</div>
    </div>
  );
};
