import type { ReactNode } from "react";
import { AlertOctagon, CheckCircle2, Inbox, Lock, PlugZap } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  empty: { Icon: Inbox, ring: "bg-sand-100 text-sand-600" },
  error: { Icon: AlertOctagon, ring: "bg-danger-soft text-danger" },
  success: { Icon: CheckCircle2, ring: "bg-success-soft text-success" },
  forbidden: { Icon: Lock, ring: "bg-navy-100 text-navy-800" },
  unconfigured: { Icon: PlugZap, ring: "bg-gold-100 text-gold-800" },
} as const;

/** Estados padronizados de página/seção: vazio, erro, sucesso, sem permissão e backend não configurado. */
export function StatePanel({
  variant, title, children, action, className, headingLevel = 2,
}: {
  variant: keyof typeof variants;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  headingLevel?: 1 | 2 | 3;
}) {
  const { Icon, ring } = variants[variant];
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <section
      role={variant === "error" ? "alert" : undefined}
      className={cn("mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-surface/70 px-6 py-12 text-center", className)}
    >
      <span className={cn("inline-flex size-14 items-center justify-center rounded-full", ring)}>
        <Icon aria-hidden className="size-7" />
      </span>
      <Heading className="font-display text-xl font-semibold text-ink">{title}</Heading>
      {children ? <div className="text-sm leading-relaxed text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div> : null}
    </section>
  );
}
