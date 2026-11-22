/** Marca NEXORA: um "N" desenhado como trecho de planta (duas paredes e a diagonal de uma porta de correr). */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="3" stroke="currentColor" strokeOpacity=".28" />
      <path d="M8 24V8l16 16V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
      <circle cx="24" cy="8" r="1.8" fill="#3478F6" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-sans text-[15px] font-semibold tracking-[0.32em]">NEXORA</span>
    </span>
  );
}
