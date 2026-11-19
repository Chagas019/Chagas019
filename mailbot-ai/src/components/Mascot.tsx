// "Mailo" — personagem original do MAILBOT AI: um envelope-robô com volume 3D (gradientes + reflexos).
const SHAPES = [
  { c: '#8b5cf6', s: 34, l: '8%', t: '14%', r: '30%', d: '0s' },
  { c: '#14b8a6', s: 26, l: '80%', t: '10%', r: '50%', d: '-2s' },
  { c: '#ff7a1a', s: 30, l: '84%', t: '66%', r: '35%', d: '-4s' },
  { c: '#ff2d87', s: 20, l: '6%', t: '70%', r: '50%', d: '-1s' },
  { c: '#0a84ff', s: 18, l: '22%', t: '86%', r: '28%', d: '-3s' },
  { c: '#ffb020', s: 14, l: '66%', t: '88%', r: '50%', d: '-5s' },
];

export function Mascot({ size = 'large', thinking = false, decor = true }: { size?: 'large' | 'small'; thinking?: boolean; decor?: boolean }) {
  return (
    <div className={`mascot ${size === 'small' ? 'small' : ''} ${thinking ? 'thinking' : ''}`} aria-hidden="true">
      {decor && size === 'large' && SHAPES.map((s, i) => (
        <span key={i} className="shape" style={{ width: s.s, height: s.s, left: s.l, top: s.t, borderRadius: s.r, animationDelay: s.d, background: `radial-gradient(circle at 30% 25%, ${s.c}ee, ${s.c} 55%, ${s.c}99)` }} />
      ))}
      <svg className="bot" viewBox="0 0 120 120">
        <defs>
          <radialGradient id="mb-body" cx="35%" cy="25%" r="85%">
            <stop offset="0" stopColor="#c4b5fd" />
            <stop offset="0.45" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#4c1d95" />
          </radialGradient>
          <linearGradient id="mb-flap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="mb-face" cx="50%" cy="40%" r="70%">
            <stop offset="0" stopColor="#1f1147" />
            <stop offset="1" stopColor="#0b0618" />
          </radialGradient>
          <radialGradient id="mb-tip" cx="40%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff7c2" />
            <stop offset="1" stopColor="#ffb020" />
          </radialGradient>
        </defs>
        <line x1="60" y1="22" x2="60" y2="10" stroke="#a78bfa" strokeWidth="3" strokeLinecap="round" />
        <circle className="antenna-tip" cx="60" cy="8" r="6" fill="url(#mb-tip)" />
        <rect x="14" y="22" width="92" height="80" rx="28" fill="url(#mb-body)" />
        <path d="M22 34 L60 62 L98 34" fill="none" stroke="url(#mb-flap)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="28" y="50" width="64" height="38" rx="19" fill="url(#mb-face)" />
        <rect className="eye" x="44" y="60" width="8" height="18" rx="4" fill="#ffffff" />
        <rect className="eye" x="68" y="60" width="8" height="18" rx="4" fill="#ffffff" />
        <ellipse cx="40" cy="32" rx="14" ry="5" fill="#ffffff" opacity="0.28" transform="rotate(-18 40 32)" />
        <circle cx="25" cy="80" r="4" fill="#ff2d87" opacity="0.55" />
        <circle cx="95" cy="80" r="4" fill="#ff2d87" opacity="0.55" />
      </svg>
    </div>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <span style={{ width: size, height: size, display: 'inline-block', position: 'relative' }}>
      <Mascot size="small" />
    </span>
  );
}
