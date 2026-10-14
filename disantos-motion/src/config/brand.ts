// Identidade visual da campanha. Cores e tipografia vêm daqui, nunca de valores soltos nas cenas.
export const BRAND = {
  name: "DISANTOS",
  // Assinatura aprovada no briefing. Não há CTA de compra confirmado, então não há link nem oferta.
  signature: "Vista a fé. Carregue a história.",
  colors: {
    black: "#030406",
    navyDeep: "#030C2C",
    navy: "#05144D", // azul-marinho exato da logo
    navyMid: "#0A2265",
    ivory: "#F3EEE3",
    ivoryDim: "rgba(243, 238, 227, 0.72)",
    blueLight: "#6E9FE0",
    blueGlow: "rgba(110, 159, 224, 0.55)",
    gold: "#F0A62A", // dourado exato da cruz e do arco da logo
    goldDim: "rgba(240, 166, 42, 0.6)",
  },
  fonts: {
    // Serif editorial para títulos (cinematográfica, clássica sem ser decorativa)
    display: "'Cormorant Garamond', 'Times New Roman', serif",
    // Sans para legendas, rótulos e assinatura
    text: "'Manrope', 'Helvetica Neue', Arial, sans-serif",
  },
} as const;
