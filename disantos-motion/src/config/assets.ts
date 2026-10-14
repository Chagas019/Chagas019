// Slots de arquivos reais. Enquanto um arquivo não existir, a cena mostra um
// quadro-reserva (placeholder) identificado, que some sozinho quando o arquivo
// entra na pasta. O status é gerado por `npm run assets` em assets.generated.ts.
import { ASSET_STATUS } from "./assets.generated";

export const PRODUCT_SLOTS = {
  macroEstampa: { file: "produtos/01-macro-estampa.png", label: "Macro da estampa (cena 02)" },
  frenteCamiseta: { file: "produtos/02-camiseta-frente.png", label: "Camiseta de frente (cena 03)" },
  detalheTecido: { file: "produtos/03-detalhe-tecido.png", label: "Detalhe do tecido (cena 03)" },
  detalheGola: { file: "produtos/04-detalhe-gola.png", label: "Detalhe da gola/costura (cena 03)" },
  composicaoHero: { file: "produtos/05-composicao-hero.png", label: "Composição principal (cena 04)" },
  usoReal: { file: "produtos/06-uso-real.jpg", label: "Uso real, se houver autorização (cena 04)" },
} as const;

export type ProductSlot = keyof typeof PRODUCT_SLOTS;

export const hasProduct = (slot: ProductSlot): boolean => ASSET_STATUS.produtos[slot];

export const LOGO_FILE = "marca/logo.png";
export const hasLogo = ASSET_STATUS.logo;

// Narração gravada (ou sintetizada por serviço de qualidade). Ela deve ocupar a linha do tempo
// inteira, de 0 a 20 s, para que as legendas e a mixagem fiquem alinhadas.
export const NARRATION_FILE = "narracao/narracao-final.wav";
export const hasNarration = ASSET_STATUS.narracao;

// Trilha: usa a licenciada se existir; senão a trilha original gerada por scripts/gerar-audio.py.
export const MUSIC_FILE = ASSET_STATUS.trilhaLicenciada
  ? "audio/trilha-licenciada.mp3"
  : "audio/trilha.wav";
export const SFX = {
  whoosh: "audio/whoosh.wav",
  impacto: "audio/impacto.wav",
  assinatura: "audio/assinatura.wav",
} as const;
