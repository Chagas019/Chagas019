import { BRAND } from "../config/brand";

// Quadro-reserva para tecido. Aparece só enquanto a foto real não existe na pasta
// public/produtos. Fica identificado com um rótulo pequeno e some sozinho quando
// o arquivo entra. Não tenta imitar a estampa de nenhum produto: é só uma superfície
// de tecido com luz rasante, para que os movimentos de câmera ainda se percebam.
export const FabricPlate: React.FC<{ label: string; showLabel?: boolean }> = ({ label, showLabel = true }) => (
  <div style={{ position: "absolute", inset: 0, background: BRAND.colors.navyMid, overflow: "hidden" }}>
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
      <filter id="weave" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.6" numOctaves="4" seed="4" result="noise" />
        <feDiffuseLighting in="noise" lightingColor="#5C82BE" surfaceScale="2.4" diffuseConstant="1.15" result="light">
          <feDistantLight azimuth="225" elevation="42" />
        </feDiffuseLighting>
      </filter>
      <rect width="100%" height="100%" filter="url(#weave)" />
    </svg>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse 70% 55% at 35% 30%, rgba(201,166,107,0.16), rgba(6,16,31,0) 65%)`,
      }}
    />
    <div style={{ position: "absolute", inset: 48, border: `1.5px solid ${BRAND.colors.goldDim}` }} />
    {showLabel && (
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 120,
          textAlign: "center",
          fontFamily: BRAND.fonts.text,
          fontSize: 26,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: BRAND.colors.goldDim,
        }}
      >
        {label}
      </div>
    )}
  </div>
);
