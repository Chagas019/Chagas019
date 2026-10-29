import { useId } from 'react';
import { Link } from 'react-router-dom';

/** Marca: duas gotas ligadas (o "fluxo" da equipe), em vidro com gradiente neon → azul. */
export function LogoMark({ size = 34 }: { size?: number }) {
  // IDs únicos: o logo aparece mais de uma vez na página (sidebar e cabeçalho).
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5F7FA" stopOpacity="0.16" />
          <stop offset="1" stopColor="#F5F7FA" stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5BFF9A" />
          <stop offset="1" stopColor="#55B8FF" />
        </linearGradient>
        <filter id={`${id}g`}>
          <feGaussianBlur stdDeviation="2.6" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" />
        </filter>
      </defs>
      <rect x="0.5" y="0.5" width="63" height="63" rx="18" fill={`url(#${id}t)`} stroke="rgba(255,255,255,0.18)" />
      {/* Metaball: duas gotas unidas por uma ponte líquida */}
      <g filter={`url(#${id}g)`} fill={`url(#${id}d)`}>
        <circle cx="23" cy="23" r="10" />
        <circle cx="41" cy="41" r="10" />
        <path d="M23 23 41 41" stroke="#5BFF9A" strokeWidth="7" />
      </g>
      <ellipse cx="20" cy="18.5" rx="3.4" ry="2" fill="#fff" opacity="0.5" />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="MídiaFlow — início">
      <LogoMark />
      {!compact && (
        <span className="leading-none">
          <span className="block text-[17px] font-bold tracking-tight">
            Mídia<span className="text-gradient">Flow</span>
          </span>
          <span className="mt-1 block text-[10.5px] text-ink-muted">Sua equipe. Sua missão.</span>
        </span>
      )}
    </Link>
  );
}
