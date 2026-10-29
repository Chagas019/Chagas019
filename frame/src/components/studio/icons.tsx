/**
 * Ícones autorais do Creative Studio. Cada um reage ao hover do botão (classe `group`)
 * com um movimento ligado à sua função. Animações somem com movimento reduzido (globals.css).
 */

type P = { className?: string };

const T = "transition-transform duration-500 ease-[var(--ease-out-expo)]";

/** Inspiração: cartões sobrepostos que se abrem em leque. */
export function IconLayers({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="ic-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset="1" stopColor="#b9bcc6" stopOpacity=".75" />
        </linearGradient>
      </defs>
      <rect x="9" y="12" width="20" height="26" rx="5" fill="#5b5e66" className={`${T} origin-[19px_38px] group-hover:-rotate-12`} />
      <rect x="13" y="10" width="20" height="26" rx="5" fill="#8b8e97" className={`${T} origin-[23px_36px] group-hover:-rotate-3`} />
      <rect x="18" y="8" width="20" height="28" rx="5" fill="url(#ic-glass)" className={`${T} origin-[28px_36px] group-hover:rotate-6 group-hover:translate-x-0.5`} />
      <path d="M24 26l4-5 3 3.5 2-2 3 3.5z" fill="#2734f0" opacity=".85" className={`${T} origin-[28px_36px] group-hover:rotate-6 group-hover:translate-x-0.5`} />
    </svg>
  );
}

/** Descobrir: nós conectados que pulsam em sequência. */
export function IconNodes({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <radialGradient id="ic-node" cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9ea1ab" />
        </radialGradient>
      </defs>
      <path d="M24 15 L13 33 M24 15 L35 33 M13 33 H35" stroke="#c9ccd4" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".9" />
      <circle cx="24" cy="15" r="7" fill="url(#ic-node)" className="origin-[24px_15px] group-hover:animate-[node-pulse_1.2s_ease-in-out_infinite]" />
      <circle cx="13" cy="33" r="7" fill="url(#ic-node)" className="origin-[13px_33px] group-hover:animate-[node-pulse_1.2s_.2s_ease-in-out_infinite]" />
      <circle cx="35" cy="33" r="7" fill="url(#ic-node)" className="origin-[35px_33px] group-hover:animate-[node-pulse_1.2s_.4s_ease-in-out_infinite]" />
    </svg>
  );
}

/** Desafios: máscara-personagem do FRAME com olhos que piscam. */
export function IconMask({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d="M10 14 L17 8 L24 14 L31 8 L38 14 V34 a6 6 0 0 1-6 6 H16 a6 6 0 0 1-6-6 Z" fill="#0d0d0d" stroke="#e9ebef" strokeWidth="2" strokeLinejoin="round" />
      <g className="origin-[24px_25px] group-hover:animate-[blink_1.6s_ease-in-out_infinite]">
        <path d="M15 27 q3-5 6 0 z" fill="#d5ff40" />
        <path d="M27 27 q3-5 6 0 z" fill="#d5ff40" />
      </g>
      <path d="M24 33 l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="#ff6b2c" className={`${T} origin-[24px_36px] group-hover:scale-125`} />
    </svg>
  );
}

/** Recursos: cofre de ideias aberto (o mostrador gira ao passar o cursor). */
export function IconVault({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="ic-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3f4f7" />
          <stop offset=".55" stopColor="#b5b8c1" />
          <stop offset="1" stopColor="#8d909a" />
        </linearGradient>
      </defs>
      <rect x="7" y="9" width="34" height="30" rx="8" fill="url(#ic-metal)" />
      <rect x="10.5" y="12.5" width="27" height="23" rx="5.5" fill="#16171a" />
      <g className={`${T} origin-[24px_24px] group-hover:rotate-[120deg]`}>
        <circle cx="24" cy="24" r="7" fill="none" stroke="#e9ebef" strokeWidth="2" />
        <path d="M24 17.5 V21 M30.5 24 H27 M24 30.5 V27 M17.5 24 H21" stroke="#e9ebef" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="24" cy="24" r="2" fill="#d5ff40" />
      <rect x="12" y="38" width="5" height="3" rx="1.5" fill="#8d909a" />
      <rect x="31" y="38" width="5" height="3" rx="1.5" fill="#8d909a" />
    </svg>
  );
}

/** Efeitos: três formas coloridas que giram em tempos diferentes. */
export function IconSparks({ className }: P) {
  const star = "M0-7 L1.6-2.2 6.7-2.2 2.6.8 4.1 5.7 0 2.7-4.1 5.7-2.6.8-6.7-2.2-1.6-2.2Z";
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="4" y="15" width="40" height="18" rx="9" fill="#141518" stroke="#3b3d44" />
      <g transform="translate(13 24)">
        <path d={star} fill="#d5ff40" className="origin-center [transform-box:fill-box] group-hover:animate-[spin_2.4s_linear_infinite]" />
      </g>
      <g transform="translate(24 24)">
        <path d={star} fill="#6b74ff" className="origin-center [transform-box:fill-box] group-hover:animate-[spin_3s_linear_infinite_reverse]" />
      </g>
      <g transform="translate(35 24)">
        <path d={star} fill="#ff6b2c" className="origin-center [transform-box:fill-box] group-hover:animate-[spin_2s_linear_infinite]" />
      </g>
    </svg>
  );
}

/** Meu estúdio: celular com um cartão de mídia que desliza para fora. */
export function IconStudio({ className }: P) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="13" y="5" width="22" height="38" rx="5" fill="#0d0d0d" stroke="#e9ebef" strokeWidth="2" />
      <rect x="20" y="7.5" width="8" height="2.5" rx="1.25" fill="#e9ebef" />
      <g className={`${T} origin-[30px_30px] group-hover:translate-x-1.5 group-hover:-rotate-6`}>
        <rect x="18" y="20" width="20" height="14" rx="3" transform="rotate(-18 28 27)" fill="#2b2d33" stroke="#9ea1ab" />
        <path d="M23 23.5h4v4h-4z" transform="rotate(-18 28 27)" fill="#c9ccd4" />
        <path d="M29 30h6" transform="rotate(-18 28 27)" stroke="#d5ff40" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}
