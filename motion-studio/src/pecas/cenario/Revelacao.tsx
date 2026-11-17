// Revelação (cena 3): uma fenda de luz se abre na escuridão, derrama luz no chão e se expande até revelar o novo cenário.
// Dono: agente PEÇAS. Dirigido por `progresso` 0..1 (o CÓDIGO mapeia frames → progresso, ex. sincronizado a "Mas escute").
// O cenário revelado entra como `children` (recortado pela abertura). Sem children: interior de luz pura.
import React, {useId} from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {clamp01, coresCenarioPadrao, f, mix, modp, type CoresCenario} from './comum';

export type RevelacaoProps = {
  /** 0 = escuro total (fenda fechada) · ~0.3 = fio de luz vertical completo · 1 = cenário inteiro revelado. */
  progresso: number;
  /** 'fenda' (vesica, pontas finas) ou 'arco' (portal com topo em arco). */
  forma?: 'fenda' | 'arco';
  /** Centro da abertura (frações). Padrão x 0.5, y 0.5. */
  centroX?: number;
  centroY?: number;
  /** Altura do fio de luz ao fim da 1ª fase (fração da altura, padrão 0.46). */
  alturaFio?: number;
  /** Luz derramada no chão a partir da base da abertura (padrão true). */
  feixeChao?: boolean;
  /** Partículas de poeira na luz (padrão 46; 0 desliga). */
  poeira?: number;
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

const forma = (tipo: 'fenda' | 'arco', cx: number, cy: number, w: number, h: number) => {
  const t = cy - h / 2;
  const b = cy + h / 2;
  const r = w / 2;
  if (tipo === 'arco') {
    const topoArco = t + Math.min(r, h / 2);
    return `M${f(cx - r)},${f(b)} L${f(cx - r)},${f(topoArco)} A${f(r)},${f(Math.min(r, h / 2))} 0 0 1 ${f(cx + r)},${f(topoArco)} L${f(cx + r)},${f(b)} Z`;
  }
  const k = r * 1.12;
  return `M${f(cx)},${f(t)} C${f(cx + k)},${f(t + h * 0.22)} ${f(cx + k)},${f(b - h * 0.22)} ${f(cx)},${f(b)} C${f(cx - k)},${f(b - h * 0.22)} ${f(cx - k)},${f(t + h * 0.22)} ${f(cx)},${f(t)} Z`;
};

export const Revelacao: React.FC<RevelacaoProps> = ({
  progresso,
  forma: tipo = 'fenda',
  centroX = 0.5,
  centroY = 0.5,
  alturaFio = 0.46,
  feixeChao = true,
  poeira = 46,
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
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = clamp01(progresso);
  const escuro = corEscuridao ?? c.preto;

  if (p >= 1) return <AbsoluteFill>{children ?? <InteriorLuz c={c} />}</AbsoluteFill>;

  const cx = W * centroX;
  const cy = H * centroY;
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  const acel = Easing.bezier(0.55, 0, 0.75, 0.2);
  // Fase A: o fio cresce na vertical. Fase B: a fenda abre (lenta e então rompe).
  const hA = interpolate(p, [0, 0.3], [0, H * alturaFio], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
  const h = p <= 0.3 ? hA : interpolate(p, [0.3, 1], [H * alturaFio, H * 2.6], {extrapolateRight: 'clamp', easing: acel});
  const w = p <= 0.3 ? interpolate(p, [0, 0.3], [1.5 * u, 4 * u], {extrapolateRight: 'clamp'}) : interpolate(p, [0.3, 1], [4 * u, W * 3.2], {extrapolateRight: 'clamp', easing: acel});
  const caminho = forma(tipo, cx, cy, w, h);

  // Intensidade da luz derramada: cresce, culmina na ruptura e cede ao novo cenário.
  const intensidade = interpolate(p, [0, 0.12, 0.3, 0.7, 0.92, 1], [0, 0.35, 0.6, 1, 0.6, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const bordaOp = interpolate(p, [0, 0.05, 0.8, 0.97], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const base = cy + h / 2;
  const raioSpill = Math.max(W * 0.35, (w + h) * 0.9);

  const particulas = Array.from({length: poeira}, (_, i) => {
    const rx = random(`${seed}-px-${i}`);
    const ry = random(`${seed}-py-${i}`);
    const vel = 0.15 + random(`${seed}-pv-${i}`) * 0.5;
    const y = modp(ry * H - frame * vel * u, H);
    const largFeixe = w / 2 + (y > cy ? (y - cy) * 0.9 : 0) + W * 0.06;
    const x = cx + (rx - 0.5) * 2 * largFeixe + Math.sin(frame / 50 + i) * 6 * u;
    const prox = Math.exp(-Math.pow((x - cx) / (largFeixe + 1), 2) * 1.5);
    return {x, y, r: (0.8 + random(`${seed}-pr-${i}`) * 2.2) * u, a: prox * (0.25 + random(`${seed}-pa-${i}`) * 0.6), i};
  });

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill style={{background: escuro, opacity: opacidadeEscuridao}} />

      {/* Cenário revelado, recortado pela abertura */}
      <AbsoluteFill style={{clipPath: `path('${caminho}')`}}>{children ?? <InteriorLuz c={c} />}</AbsoluteFill>

      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen'}}>
        <defs>
          <radialGradient id={`${id}spill`} cx={cx} cy={cy} r={raioSpill} gradientUnits="userSpaceOnUse" gradientTransform={`translate(${cx} ${cy}) scale(0.75 1) translate(${-cx} ${-cy})`}>
            <stop offset="0" stopColor={c.ambar} stopOpacity={0.55 * intensidade} />
            <stop offset="0.35" stopColor={mix(c.ambar, c.sombraQuente, 0.4)} stopOpacity={0.22 * intensidade} />
            <stop offset="1" stopColor={c.ambar} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${id}feixe`} x1="0" y1={base} x2="0" y2={H} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={mix(c.nucleo, c.ambar, 0.3)} stopOpacity={0.7 * intensidade} />
            <stop offset="0.5" stopColor={c.ambar} stopOpacity={0.22 * intensidade} />
            <stop offset="1" stopColor={c.ambar} stopOpacity={0} />
          </linearGradient>
          <filter id={`${id}blurL`} x="-100%" y="-50%" width="300%" height="200%">
            <feGaussianBlur stdDeviation={28 * u} />
          </filter>
          <filter id={`${id}blurM`} x="-100%" y="-50%" width="300%" height="200%">
            <feGaussianBlur stdDeviation={7 * u} />
          </filter>
          <filter id={`${id}blurP`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={1.4 * u} />
          </filter>
        </defs>

        <rect x={0} y={0} width={W} height={H} fill={`url(#${id}spill)`} />
        {feixeChao && base < H ? (
          <path
            d={`M${f(cx - w * 0.5)},${f(base)} L${f(cx + w * 0.5)},${f(base)} L${f(cx + w * 0.5 + (H - base) * 1.1)},${f(H)} L${f(cx - w * 0.5 - (H - base) * 1.1)},${f(H)} Z`}
            fill={`url(#${id}feixe)`}
            filter={`url(#${id}blurM)`}
          />
        ) : null}

        {/* Borda de luz: bloom largo + halo médio + núcleo fino */}
        <g opacity={bordaOp}>
          <path d={caminho} fill="none" stroke={c.ambar} strokeWidth={34 * u} strokeOpacity={0.35} filter={`url(#${id}blurL)`} />
          <path d={caminho} fill="none" stroke={mix(c.ambar, c.nucleo, 0.5)} strokeWidth={9 * u} strokeOpacity={0.7} filter={`url(#${id}blurM)`} />
          <path d={caminho} fill="none" stroke={c.nucleo} strokeWidth={2 * u} strokeOpacity={0.95} filter={`url(#${id}blurP)`} />
        </g>

        {/* Poeira de luz */}
        <g filter={`url(#${id}blurP)`}>
          {particulas.map((q) => (
            <circle key={q.i} cx={f(q.x)} cy={f(q.y)} r={f(q.r)} fill={c.nucleo} opacity={q.a * intensidade} />
          ))}
        </g>
      </svg>
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
