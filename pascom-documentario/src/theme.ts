import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource/fraunces/300.css";
import "@fontsource/fraunces/300-italic.css";
import "@fontsource/homemade-apple/400.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/600.css";
import { continueRender, delayRender } from "remotion";

export const colors = {
  night: "#050407",
  ink: "#0b0a0e",
  stone: "#1a1612",
  ember: "#7a4a1c",
  gold: "#d6a55a",
  goldLight: "#f2d49b",
  candle: "#ffcf86",
  ivory: "#f4ead8",
  glassBlue: "#1d3a7a",
  glassRuby: "#8e1b2a",
  glassAmber: "#c9811e",
  glassGreen: "#1f5a43",
  glassViolet: "#4a2a6e",
};

/**
 * Tipografia (todas OFL, servidas localmente pelo Fontsource):
 * - display: Instrument Serif — títulos de cinema, contraste alto, desenho contemporâneo.
 * - editorial: Fraunces Light — afirmações, serifa "suave" com personalidade de livro impresso.
 * - hand: Homemade Apple — a letra de alguém, para as frases íntimas (anotação do fotógrafo).
 * - mono: IBM Plex Mono — cartelas de capítulo e dados de câmera, linguagem de documentário.
 * - sans: Instrument Sans — legendas, legibilidade em celular.
 */
export const fonts = {
  display: '"Instrument Serif", "Times New Roman", serif',
  editorial: '"Fraunces", Georgia, serif',
  hand: '"Homemade Apple", cursive',
  mono: '"IBM Plex Mono", "Courier New", monospace',
  sans: '"Instrument Sans", "Helvetica Neue", Arial, sans-serif',
};

// Garante que as fontes estejam carregadas antes de qualquer quadro ser capturado.
if (typeof document !== "undefined") {
  const handle = delayRender("Carregando tipografia");
  Promise.all([
    document.fonts.load(`400 64px ${fonts.display}`),
    document.fonts.load(`italic 400 64px ${fonts.display}`),
    document.fonts.load(`300 64px ${fonts.editorial}`),
    document.fonts.load(`italic 300 64px ${fonts.editorial}`),
    document.fonts.load(`400 64px ${fonts.hand}`),
    document.fonts.load(`400 32px ${fonts.mono}`),
    document.fonts.load(`500 32px ${fonts.mono}`),
    document.fonts.load(`400 32px ${fonts.sans}`),
    document.fonts.load(`600 32px ${fonts.sans}`),
  ])
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}
