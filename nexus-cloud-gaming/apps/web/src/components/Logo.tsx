/** Marca NEXUS: um hexágono aberto com núcleo, desenhado em SVG (arte original). */
export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="nx-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4f7dff" />
          <stop offset="0.6" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#38d6f5" />
        </linearGradient>
      </defs>
      <path d="M24 3 42 13.5v21L24 45 6 34.5v-21Z" fill="none" stroke="url(#nx-g)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M15 32V17l18 15V17" fill="none" stroke="#e8ebf7" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-lg font-bold leading-none tracking-[0.12em]">
        NEXUS
        <span className="block text-[0.6rem] font-semibold tracking-[0.32em] text-muted">CLOUD GAMING</span>
      </span>
    </span>
  );
}
