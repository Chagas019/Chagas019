// Utilitários de profundidade tipográfica (extrusão sutil quente + sombra ambiente). Dono: agente TEXTO.
import {luzFe} from '../cor/tema';

/**
 * text-shadow em camadas: extrusão curta (n camadas de 1px*u) num marrom quente + sombra de contato + sombra ambiente.
 * `intensidade` 0..1 (0 = sem profundidade). `angulo` em graus (90 = sombra para baixo; luz vinda de cima).
 */
export const sombraProfundidade = (tamanho: number, intensidade = 1, angulo = 100, corExtrusao: string = luzFe.sombraQuente) => {
  if (intensidade <= 0) return 'none';
  const camadas = Math.max(2, Math.round(tamanho * 0.035 * intensidade));
  const rad = (angulo * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const partes: string[] = [];
  for (let k = 1; k <= camadas; k++) {
    partes.push(`${(dx * k).toFixed(2)}px ${(dy * k).toFixed(2)}px 0 ${corExtrusao}`);
  }
  partes.push(`${(dx * camadas * 1.6).toFixed(1)}px ${(dy * camadas * 1.6).toFixed(1)}px ${(tamanho * 0.05).toFixed(1)}px rgba(0,0,0,${(0.55 * intensidade).toFixed(2)})`);
  partes.push(`0 ${(tamanho * 0.08).toFixed(1)}px ${(tamanho * 0.32).toFixed(1)}px rgba(0,0,0,${(0.5 * intensidade).toFixed(2)})`);
  return partes.join(', ');
};

/** Brilho (glow) âmbar para palavras-chave e batidas. `forca` 0..1. */
export const brilhoAmbar = (tamanho: number, forca: number) =>
  forca <= 0.001
    ? ''
    : `0 0 ${(tamanho * 0.12).toFixed(1)}px rgba(255,178,74,${(0.45 * forca).toFixed(3)}), 0 0 ${(tamanho * 0.4).toFixed(1)}px rgba(255,154,46,${(0.3 * forca).toFixed(3)})`;

export const gradienteDourado = `linear-gradient(178deg, ${luzFe.altaQuente} 0%, ${luzFe.douradoClaro} 30%, ${luzFe.dourado} 62%, #A47B3C 100%)`;
