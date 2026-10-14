// Linha do tempo em frames (30 FPS). Todas as cenas leem daqui.
export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const seconds = (s: number) => Math.round(s * FPS);

// Duração total: 20 s
export const TOTAL_FRAMES = seconds(20);

// Cada cena começa em `from` e dura `length`. As cenas se sobrepõem por `overlap`
// frames para que a máscara da próxima cena revele a anterior sem corte seco.
export const SCENES = {
  despertar: { from: seconds(0), length: seconds(3), overlap: 0 },
  memoria: { from: seconds(3), length: seconds(4), overlap: 12 },
  identidade: { from: seconds(7), length: seconds(5), overlap: 12 },
  conexao: { from: seconds(12), length: seconds(4), overlap: 12 },
  assinatura: { from: seconds(16), length: seconds(4), overlap: 12 },
} as const;

// Pontos de impacto sonoro e viradas de corte (usados pela trilha e pelas cenas)
export const CUTS = [seconds(3), seconds(7), seconds(12), seconds(16)] as const;
export const IMPACTS = [seconds(0.4), seconds(16)] as const;
