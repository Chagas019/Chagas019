import { cn } from "@/lib/utils";

/** Cidade à noite com igreja e um voluntário observando — ilustração original. */
export function NightScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 260" preserveAspectRatio="xMidYMid slice" className={cn("select-none", className)} aria-hidden>
      <defs>
        <linearGradient id="ns-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b1a8f" /><stop offset="0.6" stopColor="#6c2bd9" /><stop offset="1" stopColor="#c43ad8" />
        </linearGradient>
        <linearGradient id="ns-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a2bb8" /><stop offset="1" stopColor="#1a1040" />
        </linearGradient>
      </defs>
      <rect width="640" height="260" fill="url(#ns-sky)" />
      <circle cx="470" cy="92" r="58" fill="#ff4f7b" />
      <g fill="#ffffff" opacity="0.8"><circle cx="80" cy="40" r="1.6" /><circle cx="160" cy="70" r="1.2" /><circle cx="300" cy="30" r="1.8" /><circle cx="580" cy="50" r="1.4" /></g>
      <g fill="#2a1466">
        <rect x="20" y="110" width="40" height="80" /><rect x="66" y="80" width="34" height="110" /><rect x="108" y="124" width="46" height="66" />
        <rect x="380" y="100" width="36" height="90" /><rect x="520" y="120" width="44" height="70" /><rect x="572" y="90" width="40" height="100" />
        {/* igreja */}
        <path d="M230 190v-66l40-30 40 30v66z" /><rect x="262" y="58" width="16" height="44" />
        <path d="M270 34v26M262 42h16" stroke="#C8FF2E" strokeWidth="4" strokeLinecap="round" />
        <rect x="318" y="140" width="50" height="50" />
      </g>
      <g fill="#ffd23f" opacity="0.85"><rect x="76" y="96" width="5" height="7" /><rect x="88" y="120" width="5" height="7" /><rect x="390" y="116" width="5" height="7" /><rect x="586" y="108" width="5" height="7" /><rect x="264" y="150" width="12" height="16" rx="6" /></g>
      <rect y="190" width="640" height="70" fill="url(#ns-water)" />
      <g stroke="#ff4f7b" strokeWidth="3" strokeLinecap="round" opacity="0.7"><path d="M430 206h80M446 220h50M458 234h26" /></g>
      {/* voluntário de costas com mochila */}
      <g>
        <path d="M120 260c0-40 14-66 46-66s46 26 46 66z" fill="#173a6b" />
        <rect x="140" y="204" width="40" height="44" rx="10" fill="#7a4a2a" />
        <circle cx="166" cy="176" r="22" fill="#0b0b12" />
        <circle cx="150" cy="166" r="12" fill="#0b0b12" /><circle cx="180" cy="162" r="12" fill="#0b0b12" />
      </g>
    </svg>
  );
}
