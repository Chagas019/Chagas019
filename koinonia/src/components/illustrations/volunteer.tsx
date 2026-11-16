import { cn } from "@/lib/utils";

const OUT = "#0B0B12";
const SKIN = "#F3B07C";
const SKIN_SHADE = "#E0956A";

/** Rosto do voluntário (ilustração original). */
function Face() {
  return (
    <g>
      {/* orelhas */}
      <ellipse cx="140" cy="190" rx="17" ry="24" fill={SKIN} stroke={OUT} strokeWidth="4" />
      <ellipse cx="322" cy="190" rx="17" ry="24" fill={SKIN} stroke={OUT} strokeWidth="4" />
      <circle cx="326" cy="214" r="4" fill="none" stroke={OUT} strokeWidth="3" />
      {/* cabeça */}
      <path d="M146 170c0-62 40-96 86-96s86 34 86 96c0 66-34 108-86 108s-86-42-86-108z" fill={SKIN} stroke={OUT} strokeWidth="4" />
      {/* cabelo cacheado: contorno claro por trás (destaca no fundo escuro) + preenchimento */}
      <g fill="#F6F6F8">
        <circle cx="160" cy="118" r="38" /><circle cx="196" cy="86" r="44" /><circle cx="244" cy="78" r="46" />
        <circle cx="288" cy="96" r="40" /><circle cx="318" cy="134" r="32" /><circle cx="146" cy="152" r="26" />
      </g>
      <path d="M146 170c0-62 40-96 86-96s86 34 86 96" fill={SKIN} />
      <g fill={OUT}>
        <circle cx="160" cy="118" r="34" /><circle cx="196" cy="86" r="40" /><circle cx="244" cy="78" r="42" />
        <circle cx="288" cy="96" r="36" /><circle cx="318" cy="134" r="28" /><circle cx="146" cy="152" r="22" />
        <path d="M150 150c30 6 70-6 90-32 14 22 44 34 78 30-10-50-50-70-90-70s-74 20-78 72z" />
      </g>
      {/* sobrancelhas */}
      <path d="M182 150q20-14 40-4M250 146q20-10 40 4" stroke={OUT} strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* olho aberto */}
      <ellipse cx="204" cy="180" rx="18" ry="22" fill="#fff" stroke={OUT} strokeWidth="4" />
      <circle cx="208" cy="184" r="10" fill={OUT} /><circle cx="212" cy="179" r="3.5" fill="#fff" />
      {/* piscadinha */}
      <path d="M252 184q18-18 38 0" stroke={OUT} strokeWidth="6" strokeLinecap="round" fill="none" />
      {/* bochechas */}
      <ellipse cx="180" cy="222" rx="16" ry="9" fill="#FF7A7A" opacity="0.45" />
      <ellipse cx="290" cy="218" rx="16" ry="9" fill="#FF7A7A" opacity="0.45" />
      {/* nariz */}
      <path d="M232 196q-8 18 6 20" stroke={SKIN_SHADE} strokeWidth="5" strokeLinecap="round" fill="none" />
      {/* sorriso aberto */}
      <path d="M196 230q40 6 86-4q-6 46-44 46t-42-42z" fill="#6E1426" stroke={OUT} strokeWidth="4" strokeLinejoin="round" />
      <path d="M204 233q34 5 70-3l-3 10q-32 6-64 2z" fill="#fff" />
      <ellipse cx="240" cy="258" rx="20" ry="10" fill="#FF6B7A" />
    </g>
  );
}

/** Voluntário acenando, de moletom roxo — ilustração original da KOINONIA. */
export function VolunteerIllustration({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 420 478" overflow="hidden" className={cn("select-none", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      {/* braço acenando (animado) */}
      <g className="animate-wave" style={{ transformOrigin: "120px 330px", transformBox: "view-box" }}>
        <path d="M150 340L96 250 74 160" stroke={OUT} strokeWidth="64" strokeLinecap="round" fill="none" />
        <path d="M150 340L96 250 74 160" stroke="#7B2FF7" strokeWidth="56" strokeLinecap="round" fill="none" />
        <g fill={SKIN} stroke={OUT} strokeWidth="4" strokeLinejoin="round">
          <rect x="34" y="40" width="20" height="74" rx="10" transform="rotate(-14 44 77)" />
          <rect x="58" y="26" width="20" height="82" rx="10" transform="rotate(-4 68 67)" />
          <rect x="82" y="30" width="20" height="78" rx="10" transform="rotate(6 92 69)" />
          <rect x="104" y="50" width="19" height="64" rx="9.5" transform="rotate(16 113 82)" />
          <path d="M40 110c-4 40 16 62 44 62s48-18 42-58z" />
          <rect x="18" y="104" width="20" height="54" rx="10" transform="rotate(-48 28 131)" />
        </g>
      </g>
      {/* corpo / moletom */}
      <path d="M96 500c0-124 40-196 136-196s140 72 140 196" fill="#7B2FF7" stroke="#F6F6F8" strokeWidth="5" />
      <path d="M232 304c-40 0-66 14-80 40 30 10 56 14 80 14s52-4 80-14c-14-26-40-40-80-40z" fill="#5F1FD0" stroke={OUT} strokeWidth="4" />
      <path d="M300 360c20 30 30 70 34 120" stroke="#5F1FD0" strokeWidth="10" strokeLinecap="round" fill="none" />
      {/* cordões em lima */}
      <path d="M212 352v62M254 352v62" stroke="#C8FF2E" strokeWidth="6" strokeLinecap="round" />
      <circle cx="212" cy="418" r="6" fill="#C8FF2E" stroke={OUT} strokeWidth="3" />
      <circle cx="254" cy="418" r="6" fill="#C8FF2E" stroke={OUT} strokeWidth="3" />
      {/* pescoço */}
      <path d="M208 262h48v40c-16 10-32 10-48 0z" fill={SKIN_SHADE} stroke={OUT} strokeWidth="4" />
      <Face />
    </svg>
  );
}

/** Retrato (rosto + ombros) para cards. */
export function VolunteerPortrait({ className }: { className?: string }) {
  return (
    <svg viewBox="110 40 240 300" className={cn("select-none", className)} aria-hidden>
      <path d="M120 340c0-50 44-80 112-80s112 30 112 80z" fill="#0B0B12" />
      <path d="M208 262h48v40c-16 10-32 10-48 0z" fill={SKIN_SHADE} stroke={OUT} strokeWidth="4" />
      <Face />
    </svg>
  );
}
