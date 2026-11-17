// Fontes do estúdio — hospedadas localmente em public/fontes (render offline e reprodutível). Dono: agente TEXTO.
// Inter e Space Grotesk: licença SIL Open Font License. Subset "latin" cobre todo o português.
import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

const arquivos: [familia: string, arquivo: string, peso: string][] = [
  ['Space Grotesk', 'SpaceGrotesk-500-latin.woff2', '500'],
  ['Space Grotesk', 'SpaceGrotesk-700-latin.woff2', '700'],
  ['Inter', 'Inter-400-latin.woff2', '400'],
  ['Inter', 'Inter-600-latin.woff2', '600'],
  ['Inter', 'Inter-800-latin.woff2', '800'],
];

arquivos.forEach(([family, arquivo, weight]) => {
  loadFont({family, url: staticFile(`fontes/${arquivo}`), weight, format: 'woff2'});
});

export const fontes = {
  display: '"Space Grotesk", system-ui, sans-serif',
  texto: '"Inter", system-ui, sans-serif',
};

/** Escala tipográfica (px em base 1080). Multiplique por `unidade()`. */
export const escala = {hero: 148, h1: 104, h2: 72, h3: 52, corpo: 38, legenda: 56, rotulo: 28} as const;
