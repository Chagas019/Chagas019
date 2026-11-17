// Identidade visual. Dono: agente COR.
export type Paleta = {
  fundo: string;
  fundo2: string;
  primaria: string;
  secundaria: string;
  destaque: string;
  texto: string;
  textoSuave: string;
  superficie: string;
  sucesso: string;
};

export const paletas: Record<string, Paleta> = {
  noite: {
    fundo: '#07070F',
    fundo2: '#14123A',
    primaria: '#7C5CFF',
    secundaria: '#22D3EE',
    destaque: '#FF4D8D',
    texto: '#F7F7FB',
    textoSuave: '#B4B6D4',
    superficie: 'rgba(255,255,255,0.08)',
    sucesso: '#34D399',
  },
  aurora: {
    fundo: '#FFF8F1',
    fundo2: '#FFE4D6',
    primaria: '#FF6B35',
    secundaria: '#7B2CBF',
    destaque: '#0EA5E9',
    texto: '#1A1423',
    textoSuave: '#5B5166',
    superficie: 'rgba(26,20,35,0.06)',
    sucesso: '#16A34A',
  },
};

export const gradientes = (p: Paleta) => ({
  marca: `linear-gradient(120deg, ${p.primaria} 0%, ${p.secundaria} 100%)`,
  quente: `linear-gradient(120deg, ${p.destaque} 0%, ${p.primaria} 100%)`,
  fundo: `radial-gradient(120% 80% at 50% 0%, ${p.fundo2} 0%, ${p.fundo} 70%)`,
});

// ---------- Contraste WCAG (usado pelo agente REVISÃO) ----------
const lum = (hex: string) => {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contraste = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
