import Link from "next/link";
import { ExternalLink, ShieldCheck, ShieldAlert, Info } from "lucide-react";

export function PageHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-8 animate-fade-up">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">{eyebrow}</p>
      <h1 className="font-serif text-3xl leading-tight text-royal-900 sm:text-4xl">{title}</h1>
      {description && <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-ivory-300/70 bg-white/80 p-5 shadow-card backdrop-blur-sm ${className}`}>{children}</div>;
}

export function Chip({ children, active = false, onClick, href }: { children: React.ReactNode; active?: boolean; onClick?: () => void; href?: string }) {
  const cls = `inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition ${
    active ? "border-royal-700 bg-royal-700 text-ivory-50" : "border-ivory-300 bg-white/70 text-ink-soft hover:border-royal-300 hover:text-royal-700"
  }`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} aria-pressed={active} className={cls}>{children}</button>;
}

export function ExtLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-sm font-medium text-royal-700 underline-offset-4 hover:underline ${className}`}>
      {children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );
}

export function VerifiedBadge({ verified = true, label }: { verified?: boolean; label?: string }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800" title="Fonte conferida pela curadoria do VERBUM">
      <ShieldCheck className="h-3 w-3" /> {label ?? "Fonte verificada"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800" title="Não foi possível verificar automaticamente">
      <ShieldAlert className="h-3 w-3" /> {label ?? "Não verificada"}
    </span>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn"; title?: string; children: React.ReactNode }) {
  const styles = tone === "warn" ? "border-amber-200 bg-amber-50/70 text-amber-900" : "border-royal-100 bg-royal-50/70 text-royal-900";
  return (
    <div role="note" className={`flex gap-3 rounded-xl border p-4 text-sm leading-relaxed ${styles}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{title && <p className="mb-0.5 font-semibold">{title}</p>}{children}</div>
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ivory-300 bg-white/50 px-6 py-12 text-center">
      <div className="mb-3 text-gold-500">{icon}</div>
      <p className="font-serif text-lg text-royal-900">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-ink-soft">{children}</div>}
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "gold" }) {
  const v = {
    primary: "bg-royal-800 text-ivory-50 hover:bg-royal-700 disabled:bg-royal-300",
    gold: "bg-gold-500 text-white hover:bg-gold-700 disabled:opacity-60",
    ghost: "border border-ivory-300 bg-white/70 text-royal-800 hover:border-royal-300",
  }[variant];
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${v} ${className}`}>
      {children}
    </button>
  );
}

export const inputCls =
  "w-full rounded-xl border border-ivory-300 bg-white px-4 py-2.5 text-[15px] text-ink placeholder:text-ink-mute/70 focus:border-royal-500 focus:outline-none focus:ring-2 focus:ring-royal-100";
