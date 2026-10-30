import { ImageResponse } from "next/og";

export const alt = "FRAME — Sua criatividade merece um mundo inteiro";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de prévia usada ao compartilhar links do FRAME (WhatsApp, Instagram, LinkedIn…). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(180deg, #0d0d0d 55%, #2a3310 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 56, height: 56, border: "5px solid #ffffff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 26, height: 26, background: "#d5ff40", borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 12 }}>FRAME</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1, letterSpacing: -3 }}>Sua criatividade merece</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1, letterSpacing: -3, color: "#d5ff40" }}>um mundo inteiro.</div>
          <div style={{ fontSize: 30, color: "#c0c2b8", marginTop: 12 }}>A rede social de fotógrafos, videomakers, editores e designers.</div>
        </div>
      </div>
    ),
    size,
  );
}
