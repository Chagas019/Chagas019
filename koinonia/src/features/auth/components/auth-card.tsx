import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="animate-rise rounded-xl border border-border/80 bg-surface p-6 shadow-lifted sm:p-8">
      <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
      {subtitle ? <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p> : null}
      <div className="mt-7">{children}</div>
      {footer ? <div className="mt-6 border-t border-border/70 pt-5 text-sm text-ink-muted">{footer}</div> : null}
    </div>
  );
}
