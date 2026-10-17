import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource-variable/inter";
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

export const fonts = {
  serif: '"Cormorant Garamond", "Times New Roman", serif',
  sans: '"Inter Variable", "Helvetica Neue", Arial, sans-serif',
};

// Garante que as fontes estejam carregadas antes de qualquer quadro ser capturado.
if (typeof document !== "undefined") {
  const handle = delayRender("Carregando tipografia");
  Promise.all([
    document.fonts.load(`400 64px ${fonts.serif}`),
    document.fonts.load(`italic 400 64px ${fonts.serif}`),
    document.fonts.load(`500 64px ${fonts.serif}`),
    document.fonts.load(`600 64px ${fonts.serif}`),
    document.fonts.load(`400 32px ${fonts.sans}`),
    document.fonts.load(`600 32px ${fonts.sans}`),
  ])
    .then(() => continueRender(handle))
    .catch(() => continueRender(handle));
}
