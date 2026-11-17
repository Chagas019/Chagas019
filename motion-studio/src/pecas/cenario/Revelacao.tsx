// Revelação (cena 3): luz real atravessando uma fenda na escuridão — um rasgo orgânico, de bordas macias e irregulares
// (noise2D), que respira, derrama uma poça de luz difusa no chão e se abre até revelar o novo cenário.
// Dono: agente PEÇAS. Dirigido por `progresso` 0..1. O cenário revelado entra como `children` (máscara com feather largo).
// Sem contornos traçados nem formas geométricas: tudo é gradiente radial sobreposto (máscara + luz em `screen`).
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {clamp01, coresCenarioPadrao, mix, modp, smooth, type CoresCenario} from './comum';

export type RevelacaoProps = {
  /** 0 = escuro total · ~0.3 = fio de luz vertical completo · 1 = cenário inteiro revelado. */
  progresso: number;
  /** 'fenda' (rasgo afinando nas duas pontas) ou 'arco' (base larga, topo arredondado e macio). */
  forma?: 'fenda' | 'arco';
  /** Centro da abertura (frações). Padrão x 0.5, y 0.5. */
  centroX?: number;
  centroY?: number;
  /** Altura do fio de luz ao fim da 1ª fase (fração da altura, padrão 0.46). */
  alturaFio?: number;
  /** Poça de luz difusa no chão abaixo da fenda (padrão true). */
  feixeChao?: boolean;
  /** Partículas de poeira na luz (padrão 46; 0 desliga). */
  poeira?: number;
  /** Irregularidade da borda 0..1 (padrão 0.6). */
  irregularidade?: number;
  /** Cor da escuridão que cobre o ambiente (padrão cores.preto). */
  corEscuridao?: string;
  /** Opacidade da escuridão (0..1, padrão 1). <1 deixa ver o cenário antigo por trás (renderize-o antes). */
  opacidadeEscuridao?: number;
  cores?: Partial<CoresCenario>;
  seed?: string;
  largura?: number;
  altura?: number;
  children?: React.ReactNode;
};

const N = 13; // fatias verticais do rasgo
const alfa = (cor: string, a: number) => `color-mix(in srgb, ${cor} ${Math.round(clamp01(a) * 1000) / 10}%, transparent)`;

export const Revelacao: React.FC<RevelacaoProps> = ({
  progresso,
  forma = 'fenda',
  centroX = 0.5,
  centroY = 0.5,
  alturaFio = 0.46,
  feixeChao = true,
  poeira = 46,
  irregularidade = 0.6,
  corEscuridao,
  opacidadeEscuridao = 1,
  cores: coresIn,
  seed = 'revelacao',
  largura,
  altura,
  children,
}) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const W = largura ?? vc.width;
  const H = altura ?? vc.height;
  const u = Math.min(W, H) / 1080;
  const c = {...coresCenarioPadrao, ...coresIn};
  const p = clamp01(progresso);
  const escuro = corEscuridao ?? c.preto;
  const conteudo = children ?? <InteriorLuz c={c} />;

  if (p >= 1) return <AbsoluteFill>{conteudo}</AbsoluteFill>;

  const cx = W * centroX;
  const cy = H * centroY;
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const acel = Easing.bezier(0.55, 0, 0.75, 0.2);
  // Fase A (0–0.3): o fio cresce na vertical. Fase B (0.3–1): o rasgo abre devagar e então rompe.
  const h =
    p <= 0.3
      ? interpolate(p, [0, 0.3], [0, H * alturaFio], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease})
      : interpolate(p, [0.3, 1], [H * alturaFio, H * 2.8], {extrapolateRight: 'clamp', easing: acel});
  const w =
    p <= 0.3
      ? interpolate(p, [0, 0.3], [2 * u, 7 * u], {extrapolateRight: 'clamp'})
      : interpolate(p, [0.3, 1], [7 * u, W * 3.4], {extrapolateRight: 'clamp', easing: acel});
  // Feather: no mínimo 12% da largura da tela assim que a fenda começa a abrir.
  const feather = Math.max(w * 0.5, W * 0.12 * smooth(0.28, 0.5, p), 3 * u);
  const intensidade = interpolate(p, [0, 0.12, 0.3, 0.7, 0.92, 1], [0, 0.45, 0.65, 1, 0.55, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const t = frame / 90;
  const irr = clamp01(irregularidade);

  // Fatias do rasgo: elipses sobrepostas com largura e desvio lateral por noise → borda orgânica que respira.
  const fatias = Array.from({length: N}, (_, i) => {
    const s = (i + 0.5) / N;
    const perfil = forma === 'arco' ? Math.pow(Math.sin(Math.PI * Math.min(1, s * 1.6) * 0.5), 0.5) : Math.pow(Math.sin(Math.PI * s), 0.7);
    const nW = noise2D(`${seed}-w`, i * 0.55, t);
    const nX = noise2D(`${seed}-x`, i * 0.4, t * 0.8);
    const wi = Math.max(1.5 * u, w * perfil * (1 + 0.45 * irr * nW));
    const xi = cx + nX * irr * (w * 0.18 + 10 * u * (1 - smooth(0.3, 0.6, p)));
    const yi = cy - h / 2 + h * s;
    const hi = (h / N) * 2.6 + 6 * u;
    return {xi, yi, wi, hi};
  });

  // Máscara do cenário revelado (preto = visível). Núcleo opaco + queda longa.
  const camadasMascara = fatias.map(
    ({xi, yi, wi, hi}) => `radial-gradient(${(wi / 2 + feather).toFixed(1)}px ${(hi / 2 + feather * 0.6).toFixed(1)}px at ${xi.toFixed(1)}px ${yi.toFixed(1)}px, #000 0%, #000 ${Math.round((wi / 2 / (wi / 2 + feather)) * 70)}%, rgba(0,0,0,0.45) 72%, transparent 100%)`,
  );
  const tudo = smooth(0.78, 1, p);
  camadasMascara.push(`linear-gradient(rgba(0,0,0,${tudo.toFixed(3)}), rgba(0,0,0,${tudo.toFixed(3)}))`);
  const mascara = camadasMascara.join(', ');

  // Luz (screen): núcleo quente estreito por fatia + halo largo. Some quando o cenário assume.
  const luzNucleo = fatias.map(({xi, yi, wi, hi}) => {
    const rx = wi / 2 + 14 * u + feather * 0.25;
    const ry = hi / 2 + 10 * u;
    return `radial-gradient(${rx.toFixed(1)}px ${ry.toFixed(1)}px at ${xi.toFixed(1)}px ${yi.toFixed(1)}px, ${alfa(c.nucleo, 0.55 * intensidade)} 0%, ${alfa(c.ambar, 0.28 * intensidade)} 45%, transparent 100%)`;
  });
  const raioHalo = Math.max(W * 0.45, (w + h) * 0.75);
  const halo = `radial-gradient(${(raioHalo * 0.7).toFixed(0)}px ${raioHalo.toFixed(0)}px at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, ${alfa(c.ambar, 0.42 * intensidade)} 0%, ${alfa(mix(c.ambar, c.sombraQuente, 0.4), 0.16 * intensidade)} 40%, transparent 100%)`;

  // Poça de luz no chão: elipses macias e alongadas em direção ao espectador (sem arestas retas).
  const base = cy + h / 2;
  const poca =
    feixeChao && base < H * 1.05
      ? [
          `radial-gradient(${(w * 0.6 + W * 0.22).toFixed(0)}px ${(H * 0.1 + (H - base) * 0.35).toFixed(0)}px at ${cx.toFixed(1)}px ${(base + H * 0.05).toFixed(1)}px, ${alfa(mix(c.nucleo, c.ambar, 0.4), 0.38 * intensidade)} 0%, ${alfa(c.ambar, 0.12 * intensidade)} 50%, transparent 100%)`,
          `radial-gradient(${(w * 0.4 + W * 0.42).toFixed(0)}px ${(H * 0.22).toFixed(0)}px at ${cx.toFixed(1)}px ${(base + H * 0.14).toFixed(1)}px, ${alfa(c.ambar, 0.14 * intensidade)} 0%, transparent 100%)`,
        ]
      : [];

  const particulas = Array.from({length: poeira}, (_, i) => {
    const rx = random(`${seed}-px-${i}`);
    const ry = random(`${seed}-py-${i}`);
    const vel = 0.15 + random(`${seed}-pv-${i}`) * 0.5;
    const y = modp(ry * H - frame * vel * u, H);
    const larg = w / 2 + feather + (y > cy ? (y - cy) * 0.5 : 0);
    const x = cx + (rx - 0.5) * 2 * larg + Math.sin(frame / 50 + i) * 6 * u;
    const prox = Math.exp(-Math.pow((x - cx) / (larg + 1), 2) * 1.5);
    const r = (0.8 + random(`${seed}-pr-${i}`) * 2.2) * u;
    return {x, y, r, a: prox * (0.25 + random(`${seed}-pa-${i}`) * 0.6) * intensidade, i};
  });

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{background: escuro, opacity: opacidadeEscuridao}} />
      <AbsoluteFill style={{WebkitMaskImage: mascara, maskImage: mascara, WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat'}}>{conteudo}</AbsoluteFill>
      <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen', backgroundImage: [...luzNucleo, ...poca, halo].join(', ')}} />
      <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
        {particulas.map((q) =>
          q.a > 0.01 ? (
            <div
              key={q.i}
              style={{
                position: 'absolute',
                left: q.x - q.r * 2,
                top: q.y - q.r * 2,
                width: q.r * 4,
                height: q.r * 4,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alfa(c.nucleo, q.a)} 0%, transparent 70%)`,
              }}
            />
          ) : null,
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Interior padrão quando não há cenário revelado: luz quente com núcleo. */
const InteriorLuz: React.FC<{c: CoresCenario}> = ({c}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(60% 45% at 50% 50%, ${c.nucleo} 0%, ${mix(c.nucleo, c.ambar, 0.55)} 30%, ${mix(c.ambar, c.sombraQuente, 0.35)} 70%, ${mix(c.sombraQuente, c.preto, 0.4)} 100%)`,
    }}
  />
);
