// Saída do agente COR para o projeto "confie-em-cristo". Arco: escuridão (1–2) → luz atravessa (3) → luminoso (4) → cruz (5) → assinatura (6).
import {gradientes, luzFe, paletas} from '../../cor/tema';

export const paletaFe = paletas.fe;
export const luz = luzFe;

export const gradFe = {
  ...gradientes(paletaFe),
  /** Céu noturno: azul escuro → preto (cenas 1–2). */
  noite: `linear-gradient(180deg, ${luzFe.azulNoite} 0%, ${luzFe.azulProfundo} 45%, ${luzFe.preto} 100%)`,
  /** Fundo profundo radial (padrão). */
  profundo: `radial-gradient(120% 75% at 50% 38%, ${luzFe.azulNoite} 0%, ${luzFe.azulProfundo} 45%, ${luzFe.preto} 100%)`,
  /** Ouro: dourado → dourado claro → âmbar (paradas vizinhas, sem banding). Texto-chave / cruz. */
  ouro: `linear-gradient(180deg, ${luzFe.douradoClaro} 0%, ${luzFe.dourado} 55%, ${luzFe.ambar} 100%)`,
  /** Amanhecer (cenas 4–6): âmbar quente no alto → marrom → preto. */
  amanhecer: `radial-gradient(110% 70% at 50% 30%, #6B4A22 0%, #2A1A0C 50%, #0A0705 100%)`,
} as const;

/** Grão e vinheta por fase do arco (interpolar entre cenas). Grão 0.04–0.08 · vinheta 0.3–0.6. */
export const atmosferaFe = {
  grao: {escuro: 0.07, transicao: 0.06, luminoso: 0.05},
  vinheta: {escuro: 0.6, transicao: 0.5, luminoso: 0.35},
} as const;
export const graoFe = 0.06;
export const vinhetaFe = 0.5;

/** `mistura` sugerida do GradacaoCor por cena (0 frio → 1 quente). */
export const misturaPorCena = {cena1: 0, cena2: 0.1, cena3: [0.15, 0.6], cena4: 0.8, cena5: 0.95, cena6: 0.9} as const;
/** `luz` sugerida do FundoProfundo por cena. */
export const luzFundoPorCena = {cena1: 0, cena2: 0.05, cena3: [0.1, 0.5], cena4: 0.7, cena5: 0.85, cena6: 0.6} as const;

/** Luz principal coerente: SEMPRE do alto, levemente à direita (x≈0.62, y<0). Sombras caem para baixo-esquerda. */
export const luzPrincipal = {origem: {x: 0.62, y: -0.06}, angulo: 192} as const;

/** Significado das cores (não trocar entre cenas). */
export const semantica = {
  texto: paletaFe.texto, // narração / frases
  palavraChave: paletaFe.primaria, // dourado: CRISTO, CONFIE, palavras de fé
  foco: paletaFe.destaque, // âmbar: fontes de luz e o "CONFIE." da cena 4 — 10% no máximo
  profundidade: paletaFe.secundaria, // azul: sombras, estrada, linhas gráficas
  referencia: paletaFe.textoSuave, // "João 14,6"
} as const;
