interface Props {
  size?: number;
  withWordmark?: boolean;
  tagline?: boolean;
}

/** Marca Chagas Color: monograma "CC" em anel dourado com íris de lente. */
export function Monogram({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="monogram">
      <defs>
        <linearGradient id="cc-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d9a0" />
          <stop offset="0.5" stopColor="#c9a45c" />
          <stop offset="1" stopColor="#8f6d33" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#cc-gold)" strokeWidth="2" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="url(#cc-gold)" strokeWidth="0.75" opacity="0.5" />
      <path
        d="M30 21.5a11 11 0 1 0 0 21"
        fill="none"
        stroke="url(#cc-gold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M41.5 23.5a9 9 0 1 0 0 17"
        fill="none"
        stroke="url(#cc-gold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="7.5" r="1.6" fill="#f1d9a0" />
    </svg>
  );
}

export function Logo({ size = 36, withWordmark = true, tagline = false }: Props) {
  return (
    <span className="logo">
      <Monogram size={size} />
      {withWordmark && (
        <span className="logo-text">
          <span className="logo-name">
            Chagas <em>Color</em>
          </span>
          {tagline && <span className="logo-tagline">FotoPreset · editor de fotografia</span>}
        </span>
      )}
    </span>
  );
}
