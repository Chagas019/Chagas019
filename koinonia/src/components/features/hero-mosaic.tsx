import { cn } from "@/lib/utils";

/**
 * Mosaico decorativo do hero (substitui fotos): painéis escuros com motivos sacros em traço dourado.
 * Totalmente vetorial, sem imagens externas; aria-hidden.
 */
const G = "#D6AE62";

const motifs = {
  candle: (
    <g fill="none" stroke={G} strokeWidth="1.6" strokeLinecap="round">
      <ellipse cx="50" cy="38" rx="9" ry="16" fill={G} fillOpacity="0.35" stroke="none" />
      <path d="M50 24c-6 8-6 16 0 22 6-6 6-14 0-22z" fill={G} fillOpacity="0.8" stroke="none" />
      <rect x="40" y="50" width="20" height="40" rx="2" />
      <path d="M50 46v4" />
    </g>
  ),
  window: (
    <g fill="none" stroke={G} strokeWidth="1.4">
      <path d="M26 92V44a24 24 0 0 1 48 0v48z" />
      <path d="M50 20v72M26 56h48M26 74h48" />
      <circle cx="50" cy="40" r="8" />
    </g>
  ),
  cross: (
    <g fill="none" stroke={G} strokeWidth="2" strokeLinecap="round">
      <path d="M50 18v66M32 38h36" />
      <circle cx="50" cy="38" r="22" strokeWidth="1" strokeDasharray="2 4" />
    </g>
  ),
  book: (
    <g fill="none" stroke={G} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M50 34c-10-6-22-6-32-2v48c10-4 22-4 32 2 10-6 22-6 32-2V32c-10-4-22-4-32 2z" />
      <path d="M50 34v48" />
    </g>
  ),
  dove: (
    <g fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 60c14 2 26-4 34-16 6 8 14 12 24 12-6 10-18 16-30 16-10 0-20-4-28-12z" />
      <path d="M56 44c-2-10 2-18 10-22-2 8 0 14 4 18" />
    </g>
  ),
  arches: (
    <g fill="none" stroke={G} strokeWidth="1.3">
      <path d="M14 90V56a12 12 0 0 1 24 0v34M38 90V56a12 12 0 0 1 24 0v34M62 90V56a12 12 0 0 1 24 0v34" />
      <path d="M10 90h80" />
    </g>
  ),
  stars: (
    <g fill={G}>
      <circle cx="24" cy="30" r="1.6" /><circle cx="70" cy="22" r="1.2" /><circle cx="52" cy="54" r="2" /><circle cx="30" cy="76" r="1.2" /><circle cx="78" cy="70" r="1.6" />
      <path d="M50 40l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
    </g>
  ),
  hands: (
    <g fill="none" stroke={G} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M50 30v40M50 30c-4-6-14-6-14 4v26c0 10 6 18 14 22M50 30c4-6 14-6 14 4v26c0 10-6 18-14 22" />
    </g>
  ),
} as const;

type Motif = keyof typeof motifs;
const TILES: Array<{ motif: Motif; tone: string }> = [
  { motif: "window", tone: "from-navy-700/70 to-night-900" },
  { motif: "candle", tone: "from-gold-500/25 to-night-900" },
  { motif: "book", tone: "from-navy-600/60 to-night-900" },
  { motif: "arches", tone: "from-night-600 to-night-900" },
  { motif: "dove", tone: "from-navy-700/70 to-night-900" },
  { motif: "stars", tone: "from-night-700 to-night-950" },
  { motif: "cross", tone: "from-gold-500/20 to-night-900" },
  { motif: "hands", tone: "from-navy-600/50 to-night-900" },
  { motif: "candle", tone: "from-gold-500/20 to-night-950" },
  { motif: "window", tone: "from-night-600 to-night-900" },
  { motif: "stars", tone: "from-navy-700/60 to-night-950" },
  { motif: "arches", tone: "from-navy-600/50 to-night-900" },
];

export function HeroMosaic({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 grid grid-cols-3 gap-1.5 p-1.5 sm:grid-cols-4 lg:grid-cols-6", className)}>
      {TILES.map((t, i) => (
        <div key={i} className={cn("relative overflow-hidden rounded-md bg-gradient-to-b", t.tone, i >= 9 && "hidden sm:block", i >= 8 && "max-sm:hidden")}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 m-auto h-3/4 w-3/4 opacity-80">{motifs[t.motif]}</svg>
        </div>
      ))}
      {/* véu escuro para leitura, como as fotos escurecidas da referência */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(10_18_34/0.82)_0%,rgb(10_18_34/0.62)_60%,rgb(5_10_21/0.85)_100%)]" />
    </div>
  );
}
