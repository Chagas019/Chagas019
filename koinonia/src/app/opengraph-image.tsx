import { ImageResponse } from "next/og";

export const alt = "KOINONIA — Talentos unidos. Uma só missão.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de compartilhamento gerada em código (sem fotos). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 0%, #4D4D4D 0%, #2B2B2B 60%, #141414 100%)", color: "#F7F5F0", fontFamily: "serif" }}>
        <svg width="120" height="120" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#8CFF5A" strokeWidth="1.2" />
          <path d="M20 9v22M13.5 16.5h13" stroke="#8CFF5A" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <div style={{ marginTop: 28, fontSize: 104, letterSpacing: 14, fontWeight: 700 }}>KOINONIA</div>
        <div style={{ marginTop: 12, fontSize: 40, color: "#B6FF8F", fontStyle: "italic" }}>Talentos unidos. Uma só missão.</div>
      </div>
    ),
    size,
  );
}
