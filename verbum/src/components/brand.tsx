import Link from "next/link";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <defs>
        <linearGradient id="vg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E2C78A" />
          <stop offset="1" stopColor="#B8924A" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="#14244D" />
      <path d="M20 7v13M14.5 12.5h11" stroke="url(#vg)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M8 22c4-1.6 8-1.2 12 1.2 4-2.4 8-2.8 12-1.2v9.5c-4-1.6-8-1.2-12 1.2-4-2.4-8-2.8-12-1.2z" fill="none" stroke="#FAF6EC" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M20 23.2v9.5" stroke="#FAF6EC" strokeWidth="1.6" />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="VERBUM — página inicial">
      <LogoMark />
      <span className={`font-serif text-xl tracking-[0.18em] ${light ? "text-ivory-50" : "text-royal-900"}`}>VERBUM</span>
    </Link>
  );
}
