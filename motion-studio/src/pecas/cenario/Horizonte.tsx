// Céu: gradiente noite→amanhecer, estrelas sutis, luz nascendo no horizonte e nuvens/névoa em camadas (parallax).
// Dono: agente PEÇAS. Determinístico (random('seed') + noise2D). Fica POR BAIXO da <Estrada>.
import React, {useId, useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {clamp01, coresCenarioPadrao, f, mix, modp, type CoresCenario} from './comum';

export type HorizonteProps = {
  /** 0 = noite fria · 1 = amanhecer âmbar (gradiente do céu, cor das nuvens, estrelas somem). */
  luz?: number;
  /** 0..1 intensidade/altura da luz nascendo (0 = escondida abaixo do horizonte, 1 = disco aflorando com halo pleno). */
  nascer?: number;
  /** Fração da altura do horizonte (padrão 0.6 — igual ao da Estrada). */
  horizonte?: number;
  /** X da fonte de luz (fração, padrão 0.5 — alinhe com o ponto de fuga). */
  solX?: number;
  /** Quantidade de estrelas (padrão 140). */
  estrelas?: number;
  /** Deslocamento lateral de câmera em px (base 1080) → parallax das nuvens por profundidade. */
  deriva?: number;
  /** Velocidade de deriva própria das nuvens (px base 1080 por frame, padrão 0.12). */
  ventoNuvens?: number;
  /** Opacidade geral das nuvens 0..1 (padrão 1). */
  nuvens?: number;
  cores?: Partial<CoresCenario>;
  seed?: string;
  largura?: number;
  altura?: number;
};

type Nuvem = {x: number; y: number; w: number; h: number; a: number};

export const Horizonte: React.FC<HorizonteProps> = ({
  luz = 0,
  nascer = 0,
  horizonte = 0.6,
  solX = 0.5,
  estrelas = 140,
  deriva = 0,
  ventoNuvens = 0.12,
  nuvens = 1,
  cores: coresIn,
  seed = 'horizonte',
  largura,
  altura,
}) => {
  const frame = useCurrentFrame();
  const vc = useVideoConfig();
  const W = largura ?? vc.width;
  const H = altura ?? vc.height;
  const u = Math.min(W, H) / 1080;
  const c = {...coresCenarioPadrao, ...coresIn};
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = clamp01(luz);
  const N = clamp01(nascer);
  const hy = H * horizonte;
  const sx = W * solX;

  // Céu: 4 paradas, cada uma misturando noite -> amanhecer.
  const topo = mix(c.preto, mix(c.azulNoite, c.preto, 0.35), L);
  const meio = mix(mix(c.azulNoite, c.preto, 0.25), mix(c.azulNoite, c.azulMedio, 0.35), L);
  const baixo = mix(mix(c.azulNoite, c.azulMedio, 0.45), mix(c.ambar, c.sombraQuente, 0.55), L);
  const rente = mix(mix(c.azulMedio, c.brancoQuente, 0.12), mix(c.ambar, c.nucleo, 0.25), L);

  // Estrelas (estáveis por seed).
  const listaEstrelas = useMemo(
    () =>
      Array.from({length: estrelas}, (_, i) => {
        const x = random(`${seed}-ex-${i}`) * W;
        const yf = Math.pow(random(`${seed}-ey-${i}`), 1.4); // mais densas no alto
        const y = yf * hy * 0.92;
        const brilho = random(`${seed}-eb-${i}`);
        const r = (0.6 + brilho * brilho * 1.9) * u;
        return {x, y, r, brilho, i, alturaRel: y / hy};
      }),
    [estrelas, seed, W, hy, u],
  );

  // Nuvens: 3 camadas (0 alta/longe ... 2 baixa/perto), faixas estratiformes.
  const camadasNuvem = useMemo(() => {
    return [0, 1, 2].map((cam) => {
      const qtd = 7 + cam * 2;
      const lista: Nuvem[] = Array.from({length: qtd}, (_, k) => ({
        x: random(`${seed}-n${cam}-x-${k}`),
        y: hy - H * (0.34 - cam * 0.11) + (random(`${seed}-n${cam}-y-${k}`) - 0.5) * H * 0.07,
        w: W * (0.35 + random(`${seed}-n${cam}-w-${k}`) * 0.55) * (1 + cam * 0.2),
        h: H * (0.008 + random(`${seed}-n${cam}-h-${k}`) * 0.012) * (1 + cam * 0.5),
        a: 0.35 + random(`${seed}-n${cam}-a-${k}`) * 0.5,
      }));
      return lista;
    });
  }, [seed, W, H, hy]);

  // Fonte de luz.
  const raioSol = W * 0.075;
  const solY = hy + raioSol * (1.15 - 1.0 * N);
  const halo = 0.15 + 0.85 * N;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id={`${id}ceu`} x1="0" y1="0" x2="0" y2={hy} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={topo} />
            <stop offset="0.45" stopColor={meio} />
            <stop offset="0.86" stopColor={baixo} />
            <stop offset="1" stopColor={rente} />
          </linearGradient>
          <radialGradient id={`${id}halo`} cx={sx} cy={hy} r={W * 0.95} gradientUnits="userSpaceOnUse" gradientTransform={`translate(${sx} ${hy}) scale(1 0.55) translate(${-sx} ${-hy})`}>
            <stop offset="0" stopColor={mix(c.ambar, c.nucleo, 0.4)} stopOpacity={0.8 * halo} />
            <stop offset="0.18" stopColor={c.ambar} stopOpacity={0.45 * halo} />
            <stop offset="0.5" stopColor={mix(c.ambar, c.sombraQuente, 0.5)} stopOpacity={0.16 * halo} />
            <stop offset="1" stopColor={c.ambar} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${id}nucleo`} cx={sx} cy={solY} r={raioSol * 3.2} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={c.nucleo} stopOpacity={0.95 * N} />
            <stop offset="0.3" stopColor={c.nucleo} stopOpacity={0.9 * N} />
            <stop offset="0.34" stopColor={mix(c.nucleo, c.ambar, 0.5)} stopOpacity={0.55 * N} />
            <stop offset="1" stopColor={c.ambar} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${id}faixaLuz`} x1="0" y1={hy - H * 0.012} x2="0" y2={hy + 1} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={c.nucleo} stopOpacity={0} />
            <stop offset="1" stopColor={c.nucleo} stopOpacity={0.55 * N} />
          </linearGradient>
          <clipPath id={`${id}acima`}>
            <rect x={0} y={0} width={W} height={hy + 1} />
          </clipPath>
          {[0, 1, 2].map((cam) => (
            <filter key={cam} id={`${id}blur${cam}`} x="-30%" y="-300%" width="160%" height="700%">
              <feGaussianBlur stdDeviation={`${(14 + cam * 8) * u} ${(5 + cam * 3) * u}`} />
            </filter>
          ))}
        </defs>

        <rect x={0} y={0} width={W} height={hy + 2} fill={`url(#${id}ceu)`} />

        {/* Estrelas: somem com a luz e perto do horizonte; cintilam por noise */}
        <g>
          {listaEstrelas.map((e) => {
            const cint = 0.65 + 0.35 * noise2D(`${seed}-cint`, e.i * 0.37, frame / 70);
            const a = (0.18 + 0.7 * e.brilho) * cint * (1 - L * 0.95) * (1 - Math.pow(e.alturaRel, 3) * 0.9);
            if (a <= 0.01) return null;
            return <circle key={e.i} cx={f(e.x)} cy={f(e.y)} r={f(e.r)} fill={mix(c.brancoQuente, c.azulMedio, 0.15)} opacity={a} />;
          })}
        </g>

        {/* Halo amplo + fonte de luz recortada no horizonte */}
        <rect x={0} y={0} width={W} height={hy + 2} fill={`url(#${id}halo)`} />
        <g clipPath={`url(#${id}acima)`}>
          <circle cx={sx} cy={solY} r={raioSol * 3.2} fill={`url(#${id}nucleo)`} />
        </g>
        <rect x={0} y={hy - H * 0.012} width={W} height={H * 0.012 + 1} fill={`url(#${id}faixaLuz)`} />

        {/* Nuvens estratiformes: iluminadas por baixo ao amanhecer, sombras frias à noite */}
        {camadasNuvem.map((lista, cam) => {
          const prof = cam / 2;
          const desloc = (deriva * (0.15 + 0.6 * prof) + frame * ventoNuvens * (0.4 + prof)) * u;
          const corBase = mix(mix(c.azulSombra, c.azulMedio, 0.2 + 0.2 * prof), mix(c.ambar, c.sombraQuente, 0.55 - 0.25 * prof), L);
          const corLuz = mix(mix(c.azulMedio, c.brancoQuente, 0.15), mix(c.ambar, c.nucleo, 0.45), L);
          return (
            <g key={cam} filter={`url(#${id}blur${cam})`} opacity={clamp01(nuvens) * (0.55 + 0.25 * prof)}>
              {lista.map((n, k) => {
                const span = W * 1.8;
                const x = modp(n.x * span + desloc, span) - W * 0.4;
                // proximidade da luz: nuvens perto do sol recebem mais luz
                const perto = Math.exp(-Math.pow((x - sx) / (W * 0.45), 2));
                return (
                  <g key={k} opacity={n.a}>
                    <ellipse cx={x} cy={n.y} rx={n.w / 2} ry={n.h} fill={corBase} />
                    <ellipse cx={x} cy={n.y + n.h * 0.55} rx={n.w * 0.38} ry={n.h * 0.45} fill={corLuz} opacity={(0.15 + 0.6 * L) * (0.4 + 0.6 * perto) * (0.4 + 0.6 * N)} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
