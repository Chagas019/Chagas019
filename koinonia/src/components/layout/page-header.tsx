import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, eyebrow, actions, className }: { title: string; subtitle?: string; eyebrow?: string; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-3xl space-y-2.5">
        {eyebrow ? <p className="text-xs font-semibold tracking-[0.2em] text-accent-ink uppercase">{eyebrow}</p> : null}
        <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
        {subtitle ? <p className="text-base leading-relaxed text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export function Container({ className, children, size = "lg" }: { className?: string; children: ReactNode; size?: "md" | "lg" | "sm" }) {
  const max = { sm: "max-w-xl", md: "max-w-4xl", lg: "max-w-7xl" }[size];
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", max, className)}>{children}</div>;
}
