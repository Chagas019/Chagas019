import { Link } from 'react-router-dom';

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="MídiaFlow — início">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden>
        <defs>
          <linearGradient id="mf-logo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5BFF9A" />
            <stop offset="1" stopColor="#55B8FF" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="18" fill="#10151D" stroke="#252F3C" />
        <path d="M15 44V21l11 13 11-13v23" fill="none" stroke="url(#mf-logo)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="47" cy="22" r="5" fill="#5BFF9A" />
      </svg>
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
